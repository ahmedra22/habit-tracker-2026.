import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// 👇 ضفنا هنا setPersistence و browserLocalPersistence
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- إعدادات فايربيز ---
const firebaseConfig = {
    apiKey: "AIzaSyA3Z9TUhNCqNR0PNosXLVT_TkTaZxIy-h8",
    authDomain: "habit-tracker-2026-c5d50.firebaseapp.com",
    projectId: "habit-tracker-2026-c5d50",
    storageBucket: "habit-tracker-2026-c5d50.firebasestorage.app",
    messagingSenderId: "424349537327",
    appId: "1:424349537327:web:ee63fdb204fb97b43022da"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 🔥🔥🔥 السطر السحري: إجبار المتصفح على حفظ تسجيل الدخول 🔥🔥🔥
setPersistence(auth, browserLocalPersistence)
    .then(() => {
        // تم تفعيل الحفظ بنجاح
        console.log("Session persistence enabled: LOCAL");
    })
    .catch((error) => {
        console.error("Persistence error:", error);
    });

// ... (كمل باقي الكود زي ما هو من غير تغيير)

// --- 🔥 جمل التحفيز 🔥 ---
const motivationQuotes = [
    "عاش يا وحش! خطوة كمان ناحية حلمك 🚀",
    "الله عليك! هو ده الالتزام اللي بيصنع المعجزات 💪",
    "وحش! استمر وكمل دوس، مفيش حاجة هتوقفك 🔥",
    "مجهود عظيم.. النسخة الأفضل منك بتتشكل دلوقتي 💎",
    "صدقني، التعب ده هيروح وهيفضل الإنجاز.. كمل! 🌟",
    "جامد! كل علامة صح بتقربك خطوة للقمة 🏔️",
    "الله ينور! انت قد التحدي وأقوى من أي كسل ⚡",
    "فخور بيك! الاستمرارية هي سر النجاح.. متوقفش! 🏆"
];

// --- المتغيرات ---
let currentUser = null;
const year = new Date().getFullYear(); 
let currentMonth = new Date().getMonth();
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ... (الكود اللي فوق زي ما هو)

// 👇 التعديل هنا: خليناهم 3 عادات افتراضية بس 👇
let habits = [
    "عادة 1", 
    "عادة 2", 
    "عادة 3"
];

// ... (باقي الكود زي ما هو)
// --- العناصر ---
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const monthSelector = document.getElementById('monthSelector');
const editHabitsBtn = document.getElementById('editHabitsBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toastElement = document.getElementById('toast');
const monthScoreElement = document.getElementById('monthScore');

// --- التحكم ---
if(loginBtn) loginBtn.addEventListener('click', () => signInWithPopup(auth, provider));
if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth).then(() => location.reload()));
if(editHabitsBtn) editHabitsBtn.addEventListener('click', () => toggleEditMode());

if(monthSelector) {
    monthSelector.value = currentMonth;
    monthSelector.addEventListener('change', (e) => {
        currentMonth = parseInt(e.target.value);
        updateDateHeader();
        listenToDatabase();
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        // 🔥🔥 هام جداً: حفظ بيانات المستخدم عشان لوحة التحكم 🔥🔥
        saveUserProfile(user);

        if(loginScreen) loginScreen.style.display = 'none';
        if(appContainer) {
             appContainer.style.display = 'block';
             appContainer.classList.remove('hidden'); 
        }
        if(document.getElementById('userPhoto')) document.getElementById('userPhoto').src = user.photoURL;
        
        const firstName = user.displayName ? user.displayName.split(' ')[0] : 'User';
        if(document.getElementById('userName')) document.getElementById('userName').textContent = firstName;
        
        setTimeout(() => {
            showToast(`نورت بيتك يا ${firstName}.. يلا نكسر الدنيا! 👋🚀`);
        }, 1500);

        updateDateHeader();
        initApp();
    } else {
        currentUser = null;
        if(loginScreen) loginScreen.style.display = 'block';
        if(appContainer) appContainer.style.display = 'none';
    }
});

// --- الدوال الأساسية ---
function showToast(message) {
    toastElement.textContent = message;
    toastElement.className = "toast show";
    setTimeout(() => toastElement.className = toastElement.className.replace("show", ""), 4000);
}

function updateDateHeader() {
    const monthLabel = document.querySelector('.year-month-values strong:last-child');
    if(monthLabel) monthLabel.textContent = monthNames[currentMonth];
    const yearLabel = document.querySelector('.year-month-values strong:first-child');
    if(yearLabel) yearLabel.textContent = year;
}

function initApp() {
    listenToDatabase();
    window.addEventListener('resize', drawChart);
}

function buildTableStructure() {
    const tbody = document.getElementById('habitsBody');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const headerRow = document.querySelector('#trackerTable thead tr');
    const perfHeaderRow = document.querySelector('#performanceTable thead tr');
    
    while (headerRow.children.length > 1) headerRow.removeChild(headerRow.lastChild);
    while (perfHeaderRow.children.length > 1) perfHeaderRow.removeChild(perfHeaderRow.lastChild);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const todayDay = new Date().getDate();
    const isCurrentMonth = new Date().getMonth() === currentMonth;
    const isCurrentYear = new Date().getFullYear() === year;

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, currentMonth, i);
        const dayName = weekDays[date.getDay()];
        const isToday = isCurrentYear && isCurrentMonth && (i === todayDay);
        const highlightClass = isToday ? 'today-col' : ''; 

        const thContent = `<th class="${highlightClass}">${i}<br>${dayName}</th>`;
        headerRow.insertAdjacentHTML('beforeend', thContent);
        perfHeaderRow.insertAdjacentHTML('beforeend', thContent);
    }
    
    const countRow = document.getElementById('countRow');
    while (countRow.children.length > 1) countRow.removeChild(countRow.lastChild);

    habits.forEach((habit, hIndex) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td class="col-habit" id="habit-name-${hIndex}">${habit}</td>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
            let td = document.createElement('td');
            td.className = 'check-cell';
            td.dataset.h = hIndex;
            td.dataset.d = d;

            const cellDate = new Date(year, currentMonth, d);
            const isFuture = cellDate > now;

            if (isToday(d)) td.classList.add('today-col');
            
            if (isFuture) {
                td.classList.add('future-cell');
                td.addEventListener('click', function() {
                    showToast("لسه بدري يا بطل! اليوم ده لسه مجاش ⏳🚫");
                });
            } else {
                td.addEventListener('click', function() {
                    if(editHabitsBtn && editHabitsBtn.textContent.includes("حفظ")) return;

                    if (!this.classList.contains('completed') && !isToday(d)) {
                         showToast("اليوم ده عدى، بس ولا يهمك! العوض في الجاي 💪");
                    }

                    if (!this.classList.contains('completed') && isToday(d)) {
                        const randomIndex = Math.floor(Math.random() * motivationQuotes.length);
                        const randomQuote = motivationQuotes[randomIndex];
                        showToast(randomQuote);
                    }

                    this.classList.toggle('completed');
                    saveDataToFirebase();
                });
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    for (let d = 1; d <= daysInMonth; d++) {
        let td = document.createElement('td');
        td.id = `count-${d}`;
        td.innerText = `0/${habits.length}`;
        if (isToday(d)) td.classList.add('today-col');
        countRow.appendChild(td);
    }

    const perfRows = document.querySelectorAll('#performanceTable tbody tr');
    perfRows.forEach(row => {
        while (row.children.length > 1) row.removeChild(row.lastChild);
        for (let d = 1; d <= daysInMonth; d++) {
            let td = document.createElement('td');
            td.className = 'perf-cell';
            td.id = `perf-${row.dataset.pct}-${d}`;
            if (isToday(d)) td.classList.add('today-col');
            td.innerHTML = '<div class="perf-dot"></div>';
            row.appendChild(td);
        }
    });
}

function isToday(day) {
    return (new Date().getFullYear() === year) && 
           (new Date().getMonth() === currentMonth) && 
           (new Date().getDate() === day);
}

function listenToDatabase() {
    if (!currentUser) return;
    onSnapshot(doc(db, "users", currentUser.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            if (data.habitNames && data.habitNames.length > 0) habits = data.habitNames;
            buildTableStructure();
            const monthKey = `habits_m_${currentMonth}`;
            const currentMonthChecks = data[monthKey] || [];
            applyDataToUI(currentMonthChecks);
        } else {
            buildTableStructure();
        }
    });
}

function applyDataToUI(savedHabits) {
    document.querySelectorAll('.check-cell').forEach(cell => cell.classList.remove('completed'));
    savedHabits.forEach(id => {
        const [h, d] = id.split('-');
        if (h < habits.length) {
            const cell = document.querySelector(`.check-cell[data-h="${h}"][data-d="${d}"]`);
            if (cell) cell.classList.add('completed');
        }
    });

    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        updateStats(d);
    }
    
    calculateMonthlyScore(savedHabits.length);
    setTimeout(drawChart, 100);
}

function calculateMonthlyScore(totalChecks) {
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const totalPossibleChecks = daysInMonth * habits.length;
    let percentage = 0;
    if(totalPossibleChecks > 0) {
        percentage = Math.round((totalChecks / totalPossibleChecks) * 100);
    }
    if(monthScoreElement) {
        monthScoreElement.textContent = `Monthly Score: ${percentage}% 🚀`;
        if(percentage >= 80) monthScoreElement.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
        else if(percentage >= 50) monthScoreElement.style.background = "linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)";
        else monthScoreElement.style.background = "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
    }
}

async function saveDataToFirebase() {
    if (!currentUser) return;
    const currentChecks = [];
    document.querySelectorAll('.check-cell.completed').forEach(cell => {
        currentChecks.push(`${cell.dataset.h}-${cell.dataset.d}`);
    });
    const monthKey = `habits_m_${currentMonth}`;
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            [monthKey]: currentChecks,
            last_updated: new Date()
        }, { merge: true });
        calculateMonthlyScore(currentChecks.length); 
    } catch (error) { console.error("Save error:", error); }
}

async function saveNamesToFirebase(newNames) {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), { habitNames: newNames }, { merge: true });
    } catch (error) { console.error("Save names error:", error); }
}

// 🔥 دالة حفظ بيانات المستخدم (الجديدة) 🔥
async function saveUserProfile(user) {
    try {
        // بنعمل merge: true عشان منمسحش العادات، بنزود بس البيانات الشخصية
        await setDoc(doc(db, "users", user.uid), {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLogin: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Error saving profile:", e);
    }
}

// دوال التعديل
window.addNewHabit = function() {
    const inputs = document.querySelectorAll('.habit-input');
    const currentValues = Array.from(inputs).map(i => i.value);
    currentValues.push("New Habit ✏️");
    habits = currentValues;
    toggleEditMode(true);
};

window.removeLastHabit = function() {
    const inputs = document.querySelectorAll('.habit-input');
    const currentValues = Array.from(inputs).map(i => i.value);
    if(currentValues.length > 1) {
        currentValues.pop();
        habits = currentValues;
        toggleEditMode(true);
    } else {
        showToast("لازم يكون فيه عادة واحدة على الأقل!");
    }
};

function toggleEditMode(forceRefresh = false) {
    const btn = document.getElementById('editHabitsBtn');
    if(!btn) return;
    const isEditing = btn.textContent.includes("حفظ");
    if (isEditing && forceRefresh !== true) {
        finishEditing(btn);
    } else {
        startEditing(btn);
    }
}

function startEditing(btn) {
    btn.textContent = "💾 حفظ التعديلات";
    btn.style.backgroundColor = "#2ecc71";
    btn.style.color = "white";
    let controlsDiv = document.getElementById('habitControls');
    if(!controlsDiv) {
        controlsDiv = document.createElement('div');
        controlsDiv.id = 'habitControls';
        controlsDiv.style.display = 'inline-block';
        controlsDiv.innerHTML = `
            <button onclick="window.addNewHabit()" class="habit-control-btn btn-add">+ زود عادة</button>
            <button onclick="window.removeLastHabit()" class="habit-control-btn btn-remove">- امسح</button>
        `;
        btn.parentNode.insertBefore(controlsDiv, btn.nextSibling);
    } else {
        controlsDiv.style.display = 'inline-block';
    }
    const tbody = document.getElementById('habitsBody');
    tbody.innerHTML = ''; 
    habits.forEach((habit, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td class="col-habit"><input type="text" class="habit-input" value="${habit}" style="width: 90%; padding: 5px;"></td>`;
        for(let d=1; d<=1; d++) { 
             let td = document.createElement('td'); 
             td.colSpan = 31; td.style.background = "#f0f0f0";
             td.innerText = " (اضغط حفظ لتفعيل الجدول) "; tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
}

function finishEditing(btn) {
    const inputs = document.querySelectorAll('.habit-input');
    const newHabits = [];
    inputs.forEach(input => {
        if(input.value.trim() !== "") newHabits.push(input.value);
    });
    if (newHabits.length === 0) newHabits.push("New Habit");
    habits = newHabits;
    btn.textContent = "⚙️ تعديل العادات";
    btn.style.backgroundColor = "#f1c40f";
    btn.style.color = "#333";
    const controlsDiv = document.getElementById('habitControls');
    if(controlsDiv) controlsDiv.style.display = 'none';
    saveNamesToFirebase(habits);
}

function updateStats(day) {
    const dayCells = document.querySelectorAll(`.check-cell[data-d="${day}"].completed`);
    const count = dayCells.length;
    const countCell = document.getElementById(`count-${day}`);
    if(countCell) countCell.innerText = `${count}/${habits.length}`;

    document.querySelectorAll(`[id^="perf-"][id$="-${day}"]`).forEach(el => el.classList.remove('active'));
    
    const totalHabits = habits.length;
    let pctClass = 0;
    const percentage = Math.round((count / totalHabits) * 100);

    if (percentage >= 100) pctClass = 100;
    else if (percentage >= 85) pctClass = 85;
    else if (percentage >= 70) pctClass = 70;
    else if (percentage >= 55) pctClass = 55;
    else if (percentage >= 40) pctClass = 40;
    else if (percentage >= 25) pctClass = 25;
    else if (percentage > 0) pctClass = 10;
    
    const dotCell = document.getElementById(`perf-${pctClass}-${day}`);
    if (dotCell) dotCell.classList.add('active');
}

// 🔥 دالة الرسم المصححة للموبايل 🔥
function drawChart() {
    const svg = document.getElementById('chartSvg');
    const container = document.querySelector('.chart-container');
    const table = document.getElementById('performanceTable');
    
    if(!svg || !container || !table) return;

    svg.innerHTML = ''; 
    let points = [];
    
    // ⚠️ أهم خطوة للموبايل: مساواة أبعاد SVG بأبعاد الجدول الكاملة
    const tableWidth = table.offsetWidth;
    const tableHeight = table.offsetHeight;
    
    svg.setAttribute('width', tableWidth);
    svg.setAttribute('height', tableHeight);
    svg.style.width = `${tableWidth}px`;
    svg.style.height = `${tableHeight}px`;

    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const activeCell = container.querySelector(`.perf-cell[id$="-${d}"].active`);
        if (activeCell) {
            // استخدام Offset بدلاً من ClientRect
            const x = activeCell.offsetLeft + (activeCell.offsetWidth / 2);
            const y = activeCell.offsetTop + (activeCell.offsetHeight / 2);
            points.push(`${x},${y}`);
        }
    }

    if (points.length > 1) {
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("class", "chart-line");
        polyline.style.fill = "none";
        polyline.style.stroke = "#3498db"; 
        polyline.style.strokeWidth = "2";
        svg.appendChild(polyline);
    }
}

// 🔥 دوال كارت البروفايل (Popup) 🔥
window.openProfileModal = function() {
    const modal = document.getElementById('profileModal');
    modal.style.display = "block";
}
window.closeProfileModal = function() {
    const modal = document.getElementById('profileModal');
    modal.style.display = "none";
}
window.onclick = function(event) {
    const modal = document.getElementById('profileModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
// ==========================================
// 🌙 منطق الوضع الليلي (Dark Mode Logic)
// ==========================================

const themeToggleBtn = document.getElementById('themeToggleBtn');
const body = document.body;

// 1. التحقق من التفضيل المحفوظ عند التحميل
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    if(themeToggleBtn) themeToggleBtn.textContent = '☀️'; // أيقونة الشمس
}

// 2. تفعيل الزرار
if(themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '🌙';
        }
    });
}


// ==========================================
// 🔔 نظام الإشعارات الذكي (Reminders)
// ==========================================

// 1. طلب الإذن أول ما الموقع يفتح (أو ممكن نربطها بزرار)
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                showToast("تم تفعيل الإشعارات بنجاح! 🔔");
                // إشعار تجريبي
                new Notification("Habit Tracker 2026", {
                    body: "أهلاً بيك يا بطل! هنفكرك كل يوم بعاداتك 😉",
                    icon: "icon-192.png" // تأكد إن فيه صورة أيقونة
                });
            }
        });
    }
}

// 2. دالة التحقق من الوقت (Check Time)
// دي هتشتغل كل دقيقة تشوف الساعة كام
setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // نحدد وقت التذكير (مثلاً الساعة 8:00 مساءً)
    const reminderHour = 20; // 20 يعني 8 بليل
    const reminderMinute = 0;

    if (hours === reminderHour && minutes === reminderMinute) {
        sendDailyReminder();
    }
}, 60000); // كل 60000 مللي ثانية (دقيقة)

function sendDailyReminder() {
    // نتأكد إن الإذن موجود
    if (Notification.permission === "granted") {
        // ممكن هنا نضيف شرط: لو لسه مخلصش كل العادات ابعتله
        // بس للتبسيط هنبعت تذكير عام
        new Notification("تذكير العادات 📅", {
            body: "يومك قرب يخلص! خلصت عادات النهاردة ولا لسه؟ 💪",
            icon: "icon-192.png",
            vibrate: [200, 100, 200]
        });
    }
}