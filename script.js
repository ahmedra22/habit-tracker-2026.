// --- 1. استيراد مكتبات فايربيز (Imports) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================================================================
// 🔥🔥 منطقة المفاتيح (مفاتيحك الخاصة موجودة هنا) 🔥🔥
const firebaseConfig = {
  apiKey: "AIzaSyA3Z9TUhNCqNR0PNosXLVT_TkTaZxIy-h8",
  authDomain: "habit-tracker-2026-c5d50.firebaseapp.com",
  projectId: "habit-tracker-2026-c5d50",
  storageBucket: "habit-tracker-2026-c5d50.firebasestorage.app",
  messagingSenderId: "424349537327",
  appId: "1:424349537327:web:ee63fdb204fb97b43022da",
  measurementId: "G-H64DTWQP50"
};
// ==================================================================

// --- 2. تشغيل فايربيز (Initialization) ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 3. المتغيرات وإعدادات الجدول ---
let currentUser = null;

// 🔥 خلينا العادات (let) مش (const) عشان نقدر نغيرها
// دي العادات الافتراضية اللي بتظهر لأول مرة بس
let habits = [
    "عادة 1 (اضغط تعديل)", "عادة 2", "عادة 3",
    "عادة 4", "عادة 5", "عادة 6", "عادة 7"
];

const totalDays = 31;
const startDayIndex = 4; // 1 Jan 2026 is Thursday
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// --- 4. التحكم في الشاشات (Auth Logic) ---
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');

// زرار تسجيل الدخول
const loginBtn = document.getElementById('loginBtn');
if(loginBtn) {
    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => console.log("Logged in"))
            .catch((error) => console.error("Login Error:", error));
    });
}

// زرار الخروج
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => location.reload());
    });
}

// 🔥 زرار تعديل العادات (الجديد)
const editHabitsBtn = document.getElementById('editHabitsBtn');
if(editHabitsBtn) {
    editHabitsBtn.addEventListener('click', toggleEditMode);
}

// مراقب حالة المستخدم
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // إظهار التطبيق
        if(loginScreen) loginScreen.style.display = 'none';
        if(appContainer) {
             appContainer.style.display = 'block';
             appContainer.classList.remove('hidden'); 
        }
        
        // عرض البيانات
        if(userPhoto) userPhoto.src = user.photoURL;
        if(userName) userName.textContent = user.displayName ? user.displayName.split(' ')[0] : 'User';
        
        setTimeout(() => initApp(), 100);

    } else {
        currentUser = null;
        if(loginScreen) loginScreen.style.display = 'block';
        if(appContainer) appContainer.style.display = 'none';
    }
});

// --- 5. منطق التطبيق (App Logic) ---

function initApp() {
    listenToDatabase();  // بنسمع للداتا الأول عشان نجيب الأسماء والتشيكات
    window.addEventListener('resize', drawChart);
}

// دالة بناء الجدول
function buildTableStructure() {
    const tbody = document.getElementById('habitsBody');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    
    // ضبط الهيدر
    const headerRow = document.querySelector('#trackerTable thead tr');
    const perfHeaderRow = document.querySelector('#performanceTable thead tr');
    
    // مسح القديم
    while (headerRow.children.length > 1) headerRow.removeChild(headerRow.lastChild);
    while (perfHeaderRow.children.length > 1) perfHeaderRow.removeChild(perfHeaderRow.lastChild);
    
    // إضافة الأيام
    for (let i = 1; i <= totalDays; i++) {
        let dayName = weekDays[(startDayIndex + i - 1) % 7];
        const thContent = `<th>${i}<br>${dayName}</th>`;
        headerRow.insertAdjacentHTML('beforeend', thContent);
        perfHeaderRow.insertAdjacentHTML('beforeend', thContent);
    }
    
    // رسم صفوف العادات
    const countRow = document.getElementById('countRow');
    while (countRow.children.length > 1) countRow.removeChild(countRow.lastChild);

    habits.forEach((habit, hIndex) => {
        let tr = document.createElement('tr');
        
        // 🔥 التغيير هنا: ضفنا ID للخلية عشان نعرف نغير الكلام اللي جواها
        tr.innerHTML = `<td class="col-habit" id="habit-name-${hIndex}">${habit}</td>`;
        
        for (let d = 1; d <= totalDays; d++) {
            let td = document.createElement('td');
            td.className = 'check-cell';
            td.dataset.h = hIndex;
            td.dataset.d = d;
            
            // عند الضغط
            td.addEventListener('click', function() {
                // ممنوع التعليم لو إحنا في وضع التعديل (زرار الحفظ ظاهر)
                if(editHabitsBtn && editHabitsBtn.textContent.includes("حفظ")) return;

                this.classList.toggle('completed');
                saveDataToFirebase(); // حفظ شامل
            });
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    // صف العداد
    for (let d = 1; d <= totalDays; d++) {
        let td = document.createElement('td');
        td.id = `count-${d}`;
        td.innerText = '0';
        countRow.appendChild(td);
    }

    // شبكة الرسم البياني
    const perfRows = document.querySelectorAll('#performanceTable tbody tr');
    perfRows.forEach(row => {
        while (row.children.length > 1) row.removeChild(row.lastChild);
        for (let d = 1; d <= totalDays; d++) {
            let td = document.createElement('td');
            td.className = 'perf-cell';
            td.id = `perf-${row.dataset.pct}-${d}`;
            td.innerHTML = '<div class="perf-dot"></div>';
            row.appendChild(td);
        }
    });
}

// دالة الاستماع للداتا (Realtime)
function listenToDatabase() {
    if (!currentUser) return;

    onSnapshot(doc(db, "users", currentUser.uid), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            
            // 🔥 أهم حتة: لو المستخدم مسيف أسماء عادات، بنستخدمها
            if (data.habitNames && data.habitNames.length > 0) {
                habits = data.habitNames;
            }
            
            // نبني الجدول بالأسماء (سواء الجديدة أو القديمة)
            buildTableStructure();
            
            // نحط علامات الصح
            const habitsData = data.habits || [];
            applyDataToUI(habitsData);
        } else {
            // مستخدم جديد (مفيش داتا لسه)
            buildTableStructure();
        }
    });
}

// دالة تحديث الواجهة بالداتا
function applyDataToUI(savedHabits) {
    // 1. تصفير
    document.querySelectorAll('.check-cell').forEach(cell => cell.classList.remove('completed'));

    // 2. تلوين
    savedHabits.forEach(id => {
        const [h, d] = id.split('-');
        const cell = document.querySelector(`.check-cell[data-h="${h}"][data-d="${d}"]`);
        if (cell) cell.classList.add('completed');
    });

    // 3. تحديث الحسابات والرسم
    for (let d = 1; d <= totalDays; d++) {
        updateStats(d);
    }
    
    // رسم الخط
    setTimeout(drawChart, 50);
}

// 🔥 دالة الحفظ الشاملة (للأسماء والعلامات)
async function saveDataToFirebase() {
    if (!currentUser) return;

    // تجميع العلامات (الصح)
    const currentChecks = [];
    document.querySelectorAll('.check-cell.completed').forEach(cell => {
        currentChecks.push(`${cell.dataset.h}-${cell.dataset.d}`);
    });

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            habits: currentChecks,      // العلامات
            habitNames: habits,         // 🔥 حفظ أسماء العادات الحالية كمان
            last_updated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Save failed:", error);
    }
}

// 🔥 دالة وضع التعديل (لما تدوس على الزرار)
function toggleEditMode() {
    const btn = document.getElementById('editHabitsBtn');
    if(!btn) return;

    // بنعرف إحنا في وضع التعديل ولا لأ من كلمة "حفظ"
    const isEditing = btn.textContent.includes("حفظ");

    if (!isEditing) {
        // 🟢 (1) لو مش بنعدل -> افتح التعديل
        btn.textContent = "💾 حفظ التعديلات";
        btn.style.backgroundColor = "#2ecc71"; // لون أخضر
        btn.style.color = "white";

        // حول النصوص لمربعات كتابة
        habits.forEach((habit, index) => {
            const cell = document.getElementById(`habit-name-${index}`);
            if(cell) {
                const oldText = cell.innerText;
                cell.innerHTML = `<input type="text" id="input-habit-${index}" value="${oldText}" style="width: 90%; padding: 5px; font-family: inherit;">`;
            }
        });

    } else {
        // 🔴 (2) لو بنعدل -> احفظ واقفل
        btn.textContent = "⚙️ تعديل العادات";
        btn.style.backgroundColor = "#f1c40f"; // رجوع للون الأصفر
        btn.style.color = "#333";

        // لم الأسماء الجديدة من المربعات
        const newHabits = [];
        for(let i=0; i<habits.length; i++) {
            const input = document.getElementById(`input-habit-${i}`);
            if(input) {
                newHabits.push(input.value);
            } else {
                newHabits.push(habits[i]); // لو ملقيناش انبت، خد القديم
            }
        }

        // حدث المتغير الرئيسي واحفظ في فايربيز
        habits = newHabits;
        saveDataToFirebase(); 
        // الدالة دي هتحفظ وتبعت لفايربيز، وفايربيز هيرد علينا في listenToDatabase والجدول هيترسم تاني لوحده
    }
}

// --- 6. دوال الرسم والحسابات ---

function updateStats(day) {
    const dayCells = document.querySelectorAll(`.check-cell[data-d="${day}"].completed`);
    const count = dayCells.length;
    
    // تحديث الرقم
    const countCell = document.getElementById(`count-${day}`);
    if(countCell) countCell.innerText = count;

    // تحديث النقطة النشطة
    document.querySelectorAll(`[id^="perf-"][id$="-${day}"]`).forEach(el => el.classList.remove('active'));

    // نحدد النسبة
    let pctClass = 0;
    if (count === 7) pctClass = 100;
    else if (count === 6) pctClass = 85;
    else if (count === 5) pctClass = 70;
    else if (count === 4) pctClass = 55;
    else if (count === 3) pctClass = 40;
    else if (count === 2) pctClass = 25;
    else if (count === 1) pctClass = 10;
    
    const dotCell = document.getElementById(`perf-${pctClass}-${day}`);
    if (dotCell) dotCell.classList.add('active');
}

// 🎨 دالة رسم الخط
function drawChart() {
    const svg = document.getElementById('chartSvg');
    const container = document.querySelector('.chart-container');
    
    if(!svg || !container) return;

    svg.innerHTML = ''; 
    let points = [];

    for (let d = 1; d <= totalDays; d++) {
        const activeCell = container.querySelector(`.perf-cell[id$="-${d}"].active`);
        if (activeCell) {
            const dot = activeCell.querySelector('.perf-dot');
            if (dot) {
                const dotRect = dot.getBoundingClientRect();
                const svgRect = svg.getBoundingClientRect();
                if (dotRect.width > 0 && svgRect.width > 0) {
                    const x = dotRect.left - svgRect.left + (dotRect.width / 2);
                    const y = dotRect.top - svgRect.top + (dotRect.height / 2);
                    points.push(`${x},${y}`);
                }
            }
        }
    }

    if (points.length > 1) {
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("class", "chart-line");
        svg.appendChild(polyline);
    }
}