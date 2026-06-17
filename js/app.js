// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, or } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD4ZK6B5-7omKtxIxDlkOMUxds1ETcXuUA",
    authDomain: "math4s.firebaseapp.com",
    projectId: "math4s",
    storageBucket: "math4s.firebasestorage.app",
    messagingSenderId: "1097373024423",
    appId: "1:1097373024423:web:0f01463fab87f6d65edb82"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAIL = "hoangtran@math4s.com"; 
const ADMIN_PASS = "toanthcs2026";

function maskEmail(email) {
    if (!email) return '---';
    if (email.length <= 13) {
        const parts = email.split('@');
        if (parts.length === 2) return parts[0].substring(0, 2) + '***@' + parts[1];
        return email;
    }
    return `${email.substring(0, 5)}***${email.substring(email.length - 8)}`;
}

function getVietnameseName(fullName) {
    if (!fullName) return { first: "", last: "" };
    let parts = fullName.trim().split(/\s+/);
    let first = parts.pop() || "";
    let last = parts.join(" ") || "";
    return { first: first.toLowerCase(), last: last.toLowerCase() };
}

// Kiểm tra tài khoản/lớp Demo
function isDemoData(cId, cName, cIdsArray) {
    if (cId === "X9snWmOPTM2RuGGwEKUs") return true;
    if (String(cName).toLowerCase() === "demo") return true;
    if (Array.isArray(cIdsArray) && cIdsArray.includes("X9snWmOPTM2RuGGwEKUs")) return true;
    return false;
}

const navStudents = document.getElementById('nav-students');
const navRooms = document.getElementById('nav-rooms');
const viewStudents = document.getElementById('view-students');
const viewRooms = document.getElementById('view-rooms');

navStudents.onclick = () => {
    navStudents.className = "pb-2 md:pb-3 px-2 tab-active transition-colors text-sm md:text-base";
    navRooms.className = "pb-2 md:pb-3 px-2 tab-inactive transition-colors text-sm md:text-base";
    viewStudents.classList.remove('hidden'); viewRooms.classList.add('hidden');
};

navRooms.onclick = () => {
    navRooms.className = "pb-2 md:pb-3 px-2 tab-active transition-colors text-sm md:text-base";
    navStudents.className = "pb-2 md:pb-3 px-2 tab-inactive transition-colors text-sm md:text-base";
    viewRooms.classList.remove('hidden'); viewStudents.classList.add('hidden');
    if(allRooms.length === 0) fetchRooms();
};

let classDict = {}; 
let loadedStudents = [];
let isDropdownLoaded = false;

signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS).then(async () => {
    document.getElementById('auth-status').innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600"></i> <span class="text-emerald-800">Đã xác thực</span>`;
    document.getElementById('auth-status').className = "flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-100 rounded-lg text-[10px] md:text-xs font-semibold";
    await buildClassDictionary();
    fetchAndRenderStudents();
}).catch(e => {
    document.getElementById('auth-status').innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-600"></i> <span class="text-rose-800">Lỗi Auth</span>`;
    document.getElementById('auth-status').className = "flex items-center gap-2 px-3 py-1.5 bg-rose-100 rounded-lg text-[10px] font-semibold";
});

async function buildClassDictionary() {
    try {
        const snap = await getDocs(collection(db, "classes"));
        snap.forEach(doc => { 
            if (doc.id === "X9snWmOPTM2RuGGwEKUs") return;
            let cleanDocId = String(doc.id).trim();
            classDict[cleanDocId] = doc.data().name || doc.data().className || doc.id; 
        });
    } catch (error) { console.warn("Lỗi tải lớp"); }
}

async function fetchAndRenderStudents() {
    const nameKw = document.getElementById('search-name').value.trim().toLowerCase();
    const classFilter = document.getElementById('search-class').value;
    const container = document.getElementById('student-list');
    container.innerHTML = `<div class="text-center text-slate-400 py-8"><i class="fa-solid fa-spinner animate-spin"></i></div>`;

    try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        loadedStudents = [];
        const uniqueClassNames = new Set();

        snap.forEach((doc) => {
            const data = doc.data();
            let rawClass = data.classIds || data.classes || data.classId || data.class || data.lop || [];
            if (typeof rawClass === 'string') rawClass = rawClass.split(',').map(s => s.trim());
            else if (!Array.isArray(rawClass)) rawClass = [rawClass];
            rawClass = rawClass.filter(Boolean);
            
            if (isDemoData(data.classId, data.className || data.name, rawClass)) return;

            const name = data.name || data.displayName || 'Chưa đặt tên';
            let mappedClasses = rawClass.map(id => {
                let cleanId = String(id).trim();
                return classDict[cleanId] ? classDict[cleanId] : cleanId;
            }).filter(Boolean);
            
            let displayClassStr = mappedClasses.length > 0 ? mappedClasses.join(', ') : 'Tự do';
            mappedClasses.forEach(c => uniqueClassNames.add(c));

            if ((!nameKw || name.toLowerCase().includes(nameKw)) && (classFilter === 'all' || displayClassStr.includes(classFilter))) {
                loadedStudents.push({ ...data, uid: doc.id, _displayClass: displayClassStr, _name: name });
            }
        });

        if (!isDropdownLoaded) {
            let opts = `<option value="all">Tất cả lớp</option><option value="Tự do">Thi tự do</option>`;
            Array.from(uniqueClassNames).sort().forEach(c => opts += `<option value="${c}">${c}</option>`);
            document.getElementById('search-class').innerHTML = opts;
            isDropdownLoaded = true;
        }
        renderStudentList();
    } catch (error) { 
        console.error(error);
        container.innerHTML = `<div class="text-center text-rose-500 py-8 text-sm">Lỗi truy xuất users. Xem Console Log.</div>`; 
    }
}

function renderStudentList() {
    document.getElementById('student-count').textContent = loadedStudents.length;
    const container = document.getElementById('student-list');
    container.innerHTML = "";
    if(loadedStudents.length === 0) { container.innerHTML = `<div class="text-center text-slate-400 py-8 text-sm">Không có dữ liệu.</div>`; return; }

    loadedStudents.forEach((st) => {
        const isFree = st._displayClass === 'Tự do';
        const card = document.createElement('div');
        card.className = "p-2 md:p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-lg md:rounded-xl cursor-pointer";
        card.innerHTML = `
            <div class="font-semibold text-xs md:text-sm text-slate-800 line-clamp-1">${st._name}</div>
            <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] text-slate-400">${maskEmail(st.email)}</span>
                <span class="px-2 py-0.5 rounded font-bold text-[9px] md:text-[10px] uppercase ${isFree ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'} whitespace-nowrap">${st._displayClass}</span>
            </div>`;
        card.onclick = () => showSubmissionsForStudent(st);
        container.appendChild(card);
    });
}

async function showSubmissionsForStudent(student) {
    document.getElementById('empty-detail-state').classList.add('hidden');
    document.getElementById('detail-pane').classList.remove('hidden');
    document.getElementById('student-info-lbl').innerHTML = `${student._name} <span class="text-[10px] md:text-xs font-normal text-slate-500">(${student._displayClass})</span>`;
    
    const tbody = document.getElementById('history-rows');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4"><i class="fa-solid fa-spinner animate-spin text-blue-500"></i></td></tr>`;

    try {
        const q = query(collection(db, "submissions"), or(where("student.id", "==", student.uid), where("studentId", "==", student.uid)));
        const snap = await getDocs(q);
        let subs = [];
        snap.forEach(d => subs.push({id: d.id, ...d.data()}));
        
        subs.sort((a,b) => (b.submittedAt ? new Date(b.submittedAt).getTime() : 0) - (a.submittedAt ? new Date(a.submittedAt).getTime() : 0));

        let totalScore = 0, maxScore = 0, rows = "";
        subs.forEach(s => {
            let score = s.score || s.totalScore || 0;
            totalScore += score;
            if(score > maxScore) maxScore = score;
            let dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleString("vi-VN") : "---";
            let warnings = s.tabSwitchCount > 0 ? `<span class="text-rose-500 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ${s.tabSwitchCount}</span>` : `<span class="text-emerald-500"><i class="fa-solid fa-check"></i></span>`;

            rows += `
                <tr class="hover:bg-slate-50 border-b border-slate-50">
                    <td class="p-2 md:p-3 text-[10px] md:text-xs">
                        <div class="font-bold text-blue-700">${s.roomCode || s.roomId || '?'}</div>
                        <div class="text-slate-400 mt-0.5 truncate max-w-[100px] md:max-w-[150px]">${s.examId}</div>
                    </td>
                    <td class="p-2 md:p-3 text-[10px] md:text-xs">${warnings}</td>
                    <td class="p-2 md:p-3 text-[10px] md:text-xs text-slate-500">${dateStr}</td>
                    <td class="p-2 md:p-3 text-right">
                        <div class="font-bold text-slate-800 text-xs md:text-sm">${score.toFixed(1)} đ</div>
                        <div class="text-[9px] md:text-[10px] text-slate-400">${(s.percentage || 0).toFixed(0)}%</div>
                    </td>
                </tr>`;
        });

        document.getElementById('stat-count').textContent = subs.length;
        document.getElementById('stat-max').textContent = maxScore.toFixed(1);
        document.getElementById('stat-avg').textContent = subs.length > 0 ? (totalScore/subs.length).toFixed(1) : "0.0";
        tbody.innerHTML = subs.length === 0 ? `<tr><td colspan="4" class="text-center p-4 text-xs">Chưa nộp bài.</td></tr>` : rows;
    } catch (e) { 
        console.error(e); 
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-rose-500 text-xs">Lỗi truy xuất Submissions.</td></tr>`; 
    }
}

document.getElementById('btn-search').onclick = fetchAndRenderStudents;

let allRooms = [];
let curRoomPage = 1;
const ROOMS_PER_PAGE = 6;
let currentRoomSubs = []; 
let sortConfig = { key: 'score', dir: 'desc' }; 

window.sortRoomData = function(key) {
    if (sortConfig.key === key) {
        sortConfig.dir = sortConfig.dir === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.dir = key === 'name' ? 'asc' : 'desc'; 
    }
    window.renderRoomSubmissionsTable();
};

async function fetchRooms() {
    const listEl = document.getElementById('rooms-list');
    listEl.innerHTML = `<div class="text-center text-slate-400 py-8"><i class="fa-solid fa-spinner animate-spin"></i></div>`;
    try {
        const snap = await getDocs(collection(db, "rooms"));
        allRooms = [];
        snap.forEach(doc => allRooms.push({ id: doc.id, ...doc.data() }));
        allRooms.sort((a,b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        curRoomPage = 1;
        renderRoomsPage();
    } catch (e) { console.error(e); }
}

function renderRoomsPage() {
    const statusFilter = document.getElementById('room-status-filter').value;
    const dateFilter = document.getElementById('room-date-filter').value;
    
    let filtered = allRooms.filter(r => {
        let mStatus = statusFilter === 'all' || r.status === statusFilter;
        let mDate = true;
        if(dateFilter && r.createdAt) {
            mDate = (new Date(r.createdAt).toISOString().split('T')[0] === dateFilter);
        }
        return mStatus && mDate;
    });

    const totalPages = Math.ceil(filtered.length / ROOMS_PER_PAGE) || 1;
    document.getElementById('room-page-info').textContent = `Trang ${curRoomPage} / ${totalPages}`;
    document.getElementById('btn-prev-room').disabled = curRoomPage === 1;
    document.getElementById('btn-next-room').disabled = curRoomPage === totalPages;

    const pageData = filtered.slice((curRoomPage-1)*ROOMS_PER_PAGE, curRoomPage*ROOMS_PER_PAGE);
    const listEl = document.getElementById('rooms-list');
    listEl.innerHTML = "";
    if(pageData.length === 0) { listEl.innerHTML = `<div class="text-center p-4 text-xs">Không có phòng.</div>`; return; }

    pageData.forEach(r => {
        const isStatusActive = r.status === 'active';
        const card = document.createElement('div');
        card.className = `p-2 md:p-3 bg-white border ${isStatusActive ? 'border-blue-300' : 'border-slate-200'} rounded-lg md:rounded-xl cursor-pointer`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-1.5">
                <div class="flex-1 pr-2">
                    <h4 class="font-bold text-xs md:text-sm text-slate-800 line-clamp-1">${r.examTitle || 'Đề không tên'}</h4>
                </div>
                <span class="${isStatusActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">${r.status || 'unknown'}</span>
            </div>
            <div class="flex justify-between items-center text-[10px] md:text-[11px] bg-slate-50 p-1 md:p-1.5 rounded text-slate-600">
                <span class="font-mono font-bold text-blue-600"><i class="fa-solid fa-key mr-1"></i>${r.code || r.id}</span>
                <span><i class="fa-solid fa-user-check mr-1"></i>${r.submittedCount || 0}/${r.totalStudents || 0}</span>
            </div>`;
        card.onclick = () => loadRoomSubmissions(r);
        listEl.appendChild(card);
    });
}

document.getElementById('btn-load-rooms').onclick = fetchRooms;
document.getElementById('btn-prev-room').onclick = () => { curRoomPage--; renderRoomsPage(); };
document.getElementById('btn-next-room').onclick = () => { curRoomPage++; renderRoomsPage(); };

let currentRoomLink = "";
document.getElementById('btn-copy-link').onclick = () => {
    navigator.clipboard.writeText(currentRoomLink);
    alert("Đã copy link: " + currentRoomLink);
};

async function loadRoomSubmissions(room) {
    document.getElementById('room-detail-title').textContent = `${room.examTitle || room.code}`;
    document.getElementById('room-detail-subtitle').textContent = `Đang tải...`;
    
    currentRoomLink = `https://toanthayhoang.vercel.app/?room=${room.code || room.id}`;
    document.getElementById('btn-thi-ngay').href = currentRoomLink;
    document.getElementById('room-link-container').classList.remove('hidden');

    const tbody = document.getElementById('room-students-rows');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4"><i class="fa-solid fa-spinner animate-spin"></i></td></tr>`;

    try {
        const snap = await getDocs(query(collection(db, "submissions"), or(where("roomId", "==", room.id), where("roomCode", "==", room.code))));
        currentRoomSubs = [];
        
        snap.forEach(d => {
            let subData = d.data();
            let stObj = subData.student || {};
            let stClassRaw = stObj.classIds || stObj.classes || stObj.classId || stObj.className || [];
            if (typeof stClassRaw === 'string') stClassRaw = stClassRaw.split(',').map(s => s.trim());
            else if (!Array.isArray(stClassRaw)) stClassRaw = [stClassRaw];
            
            if (isDemoData(stObj.classId, stObj.className || stObj.name, stClassRaw)) return;
            
            currentRoomSubs.push(subData);
        });
        
        document.getElementById('room-detail-subtitle').textContent = `Có ${currentRoomSubs.length} bài nộp`;
        document.getElementById('room-search-student').value = ''; 
        
        window.renderRoomSubmissionsTable();
    } catch (e) { console.error(e); tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-rose-500">Lỗi truy xuất dữ liệu.</td></tr>`; }
}

window.renderRoomSubmissionsTable = function() {
    const tbody = document.getElementById('room-students-rows');
    const searchKw = document.getElementById('room-search-student').value.trim().toLowerCase();
    
    let filteredSubs = currentRoomSubs;
    if (searchKw) {
        filteredSubs = currentRoomSubs.filter(s => {
            let stName = (s.student && s.student.name) ? s.student.name.toLowerCase() : '';
            return stName.includes(searchKw);
        });
    }

    if(filteredSubs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-slate-500 text-xs">Không có dữ liệu phù hợp.</td></tr>`;
        return;
    }

    filteredSubs.sort((a, b) => {
        if (sortConfig.key === 'score') {
            let scoreA = a.score || 0;
            let scoreB = b.score || 0;
            return sortConfig.dir === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        } else if (sortConfig.key === 'name') {
            let nameA = (a.student && a.student.name) ? a.student.name : '';
            let nameB = (b.student && b.student.name) ? b.student.name : '';
            let pA = getVietnameseName(nameA);
            let pB = getVietnameseName(nameB);
            let cmpFirst = pA.first.localeCompare(pB.first, 'vi');
            if (cmpFirst !== 0) return sortConfig.dir === 'asc' ? cmpFirst : -cmpFirst;
            let cmpLast = pA.last.localeCompare(pB.last, 'vi');
            return sortConfig.dir === 'asc' ? cmpLast : -cmpLast;
        } else if (sortConfig.key === 'class') {
            let classARaw = (a.student && (a.student.classIds || a.student.classes || a.student.classId || a.student.className)) || [];
            let classBRaw = (b.student && (b.student.classIds || b.student.classes || b.student.classId || b.student.className)) || [];
            
            let getDisplay = (raw) => {
                if (typeof raw === 'string') raw = raw.split(',').map(s => s.trim());
                else if (!Array.isArray(raw)) raw = [raw];
                let mapped = raw.map(id => classDict[String(id).trim()] || String(id).trim()).filter(Boolean);
                return mapped.length > 0 ? mapped.join(', ') : 'Tự do';
            };
            
            let dispA = getDisplay(classARaw);
            let dispB = getDisplay(classBRaw);
            let cmpClass = dispA.localeCompare(dispB, 'vi');
            return sortConfig.dir === 'asc' ? cmpClass : -cmpClass;
        }
    });

    document.querySelectorAll('th.sortable i').forEach(icon => icon.className = 'fa-solid fa-sort ml-1 text-slate-300');
    const activeTh = document.querySelector(`th[data-sort="${sortConfig.key}"]`);
    if (activeTh) {
        activeTh.querySelector('i').className = `fa-solid ${sortConfig.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} ml-1 text-blue-500`;
    }

    let rows = "";
    filteredSubs.forEach((s, idx) => {
        let stName = (s.student && s.student.name) || 'Vô danh';
        
        let stClassRaw = (s.student && (s.student.classIds || s.student.classes || s.student.classId || s.student.className)) || [];
        if (typeof stClassRaw === 'string') stClassRaw = stClassRaw.split(',').map(str => str.trim());
        else if (!Array.isArray(stClassRaw)) stClassRaw = [stClassRaw];
        
        let mappedStClasses = stClassRaw.map(id => {
            let cleanId = String(id).trim();
            return classDict[cleanId] ? classDict[cleanId] : cleanId;
        }).filter(Boolean);
        let displayClass = mappedStClasses.length > 0 ? mappedStClasses.join(', ') : 'Tự do';
        
        let warnings = s.tabSwitchCount > 0 ? `<span class="text-rose-500 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> ${s.tabSwitchCount}</span>` : `<span class="text-emerald-500"><i class="fa-solid fa-check"></i></span>`;
        let isTop1 = (idx === 0 && sortConfig.key === 'score' && sortConfig.dir === 'desc');

        rows += `
            <tr class="hover:bg-slate-50 border-b border-slate-50">
                <td class="p-2 md:p-3 text-[10px] md:text-xs">
                    <div class="font-bold text-slate-800">${isTop1 ? '<i class="fa-solid fa-crown text-amber-400 mr-1"></i>' : ''}${stName}</div>
                    <div class="text-[9px] md:text-[10px] text-slate-400 mt-0.5">${Math.floor((s.duration||0)/60)}p ${(s.duration||0)%60}s</div>
                </td>
                <td class="p-2 md:p-3 text-[10px] md:text-xs font-bold text-slate-600">${displayClass}</td>
                <td class="p-2 md:p-3 text-[10px] md:text-xs">${warnings}</td>
                <td class="p-2 md:p-3 text-right">
                    <div class="font-bold text-xs md:text-sm ${s.score >= 8 ? 'text-emerald-600' : 'text-blue-600'}">${(s.score || 0).toFixed(1)} đ</div>
                    <div class="text-[9px] md:text-[10px] text-slate-400">${(s.percentage || 0).toFixed(0)}%</div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = rows;
};