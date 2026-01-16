// --- 1. استيراد مكتبات فايربيز (Imports) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================================================================
// 🔥🔥 منطقة المفاتيح (تم وضع مفاتيحك الخاصة هنا) 🔥🔥
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
const habits = [
    "🕌 الصلاة في وقتها", "📖 ورد القرآن", "💻 تعلم JavaScript",
    "🗣️ ممارسة English", "⚖️ مذاكرة الكلية", "🏋️ الجيم / رياضة", "🚫 تشتت وسوشيال"
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
            .then((result) => console.log("Logged in:", result.user))
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

// مراقب حالة المستخدم (بيشتغل أول ما الموقع يفتح)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // المستخدم موجود ✅
        currentUser = user;
        if(loginScreen) loginScreen.style.display = 'none';
        if(appContainer) appContainer.style.display = 'block';
        
        // عرض البيانات الشخصية
        if(userPhoto) userPhoto.src = user.photoURL;
        if(userName) userName.textContent = user.displayName ? user.displayName.split(' ')[0] : 'User';
        
        // تشغيل التطبيق (مع تأخير بسيط عشان نضمن إن العناصر ظهرت)
        setTimeout(() => {
            initApp();
        }, 100);

    } else {
        // مفيش مستخدم ❌
        currentUser = null;
        if(loginScreen) loginScreen.style.display = 'block';
        if(appContainer) appContainer.style.display = 'none';
    }
});

// --- 5. منطق التطبيق (App Logic) ---

function initApp() {
    buildTableStructure();      // 1. نبني الجدول HTML
    listenToDatabase();         // 2. نجيب الداتا من فايربيز
    window.addEventListener('resize', drawChart); // 3. نعيد الرسم لو الشاشة حجمها اتغير
}

// دالة بناء الجدول
function buildTableStructure() {
    const tbody = document.getElementById('habitsBody');
    if(!tbody) return;
    tbody.innerHTML = ''; // تنظيف
    
    // ضبط الهيدر (الأيام)
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
        tr.innerHTML = `<td class="col-habit">${habit}</td>`;
        
        for (let d = 1; d <= totalDays; d++) {
            let td = document.createElement('td');
            td.className = 'check-cell';
            td.dataset.h = hIndex;
            td.dataset.d = d;
            
            // عند الضغط
            td.addEventListener('click', function() {
                this.classList.toggle('completed');
                saveHabitsToFirebase(); // حفظ فوري
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
            const habitsData = docSnapshot.data().habits || [];
            applyDataToUI(habitsData);
        } else {
            applyDataToUI([]); // مستخدم جديد
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
    
    // رسم الخط (بنديه فرصة لحظة عشان الحسابات تخلص)
    setTimeout(drawChart, 50);
}

// دالة الحفظ
async function saveHabitsToFirebase() {
    if (!currentUser) return;

    const currentData = [];
    document.querySelectorAll('.check-cell.completed').forEach(cell => {
        currentData.push(`${cell.dataset.h}-${cell.dataset.d}`);
    });

    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            habits: currentData,
            last_updated: new Date()
        }, { merge: true });
    } catch (error) {
        console.error("Save failed:", error);
    }
}

// --- 6. دوال الرسم والحسابات (Logic) ---

function updateStats(day) {
    const dayCells = document.querySelectorAll(`.check-cell[data-d="${day}"].completed`);
    const count = dayCells.length;
    
    // تحديث الرقم
    const countCell = document.getElementById(`count-${day}`);
    if(countCell) countCell.innerText = count;

    // تحديث النقطة النشطة
    // الأول نمسح القديم في اليوم ده
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

// 🎨 دالة رسم الخط (Magic Function)
function drawChart() {
    const svg = document.getElementById('chartSvg');
    const container = document.querySelector('.chart-container');
    
    if(!svg || !container) return;

    // تنظيف الخط القديم
    svg.innerHTML = ''; 
    let points = [];

    for (let d = 1; d <= totalDays; d++) {
        // بندور على النقطة النشطة في كل يوم
        const activeCell = container.querySelector(`.perf-cell[id$="-${d}"].active`);
        
        if (activeCell) {
            const dot = activeCell.querySelector('.perf-dot');
            if (dot) {
                // حساب المكان بدقة بالنسبة للـ SVG
                const dotRect = dot.getBoundingClientRect();
                const svgRect = svg.getBoundingClientRect();
                
                // التأكد إن العناصر ظاهرة وليها أبعاد
                if (dotRect.width > 0 && svgRect.width > 0) {
                    const x = dotRect.left - svgRect.left + (dotRect.width / 2);
                    const y = dotRect.top - svgRect.top + (dotRect.height / 2);
                    points.push(`${x},${y}`);
                }
            }
        }
    }

    // رسم الخط لو فيه نقطتين أو أكتر
    if (points.length > 1) {
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("points", points.join(" "));
        polyline.setAttribute("class", "chart-line");
        svg.appendChild(polyline);
    }
}