// --- Configuration (الإعدادات) ---
const habits = [
    "🕌 الصلاة في وقتها",
    "📖 ورد القرآن",
    "💻 تعلم JavaScript",
    "🗣️ ممارسة English",
    "⚖️ مذاكرة الكلية",
    "🏋️ الجيم / رياضة",
    "🚫 تشتت وسوشيال"
];

// إعدادات شهر يناير 2026
const totalDays = 31;
// 1 Jan 2026 is Thursday (0=Sun, 1=Mon, ..., 4=Thu)
const startDayIndex = 4; 
const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const storageKey = 'habitTracker_Jan2026';

// --- Initialization (بداية التشغيل) ---
document.addEventListener('DOMContentLoaded', () => {
    initTableStructure();
    renderHabits();
    renderPerformanceGrid();
    loadData();
    
    // تفعيل زرار المسح
    document.getElementById('resetBtn').addEventListener('click', resetData);
});

// --- Functions (الدوال) ---

// 1. رسم رؤوس الجدول (الأيام)
function initTableStructure() {
    const headerRow = document.querySelector('#trackerTable thead tr');
    const perfHeaderRow = document.querySelector('#performanceTable thead tr');

    for (let i = 1; i <= totalDays; i++) {
        let dayName = weekDays[(startDayIndex + i - 1) % 7];
        const thContent = `<th>${i}<br>${dayName}</th>`;
        
        // نضيف لجدول العادات
        headerRow.insertAdjacentHTML('beforeend', thContent);
        // نضيف لجدول الأداء
        perfHeaderRow.insertAdjacentHTML('beforeend', thContent);
    }
}

// 2. رسم صفوف العادات
function renderHabits() {
    const tbody = document.getElementById('habitsBody');
    const countRow = document.getElementById('countRow');

    // إنشاء صفوف العادات
    habits.forEach((habit, hIndex) => {
        let tr = document.createElement('tr');
        
        // اسم العادة
        let nameTd = document.createElement('td');
        nameTd.className = 'col-habit';
        nameTd.textContent = habit;
        tr.appendChild(nameTd);

        // مربعات الأيام
        for (let d = 1; d <= totalDays; d++) {
            let td = document.createElement('td');
            td.className = 'check-cell';
            td.dataset.h = hIndex; // رقم العادة
            td.dataset.d = d;      // رقم اليوم
            
            // إضافة حدث النقر (Click Event)
            td.addEventListener('click', function() {
                toggleCheck(this);
            });
            
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    // إنشاء خلايا صف العداد (Total Count)
    for (let d = 1; d <= totalDays; d++) {
        let td = document.createElement('td');
        td.id = `count-${d}`;
        td.innerText = '0';
        countRow.appendChild(td);
    }
}

// 3. رسم شبكة الأداء (النقط)
function renderPerformanceGrid() {
    const rows = document.querySelectorAll('#performanceTable tbody tr');
    rows.forEach(row => {
        for (let d = 1; d <= totalDays; d++) {
            let td = document.createElement('td');
            td.className = 'perf-cell';
            td.id = `perf-${row.dataset.pct}-${d}`; // مثال: perf-100-1
            td.innerHTML = '<div class="perf-dot"></div>';
            row.appendChild(td);
        }
    });
}

// --- Logic (المنطق) ---

function toggleCheck(cell) {
    cell.classList.toggle('completed');
    saveData();
    updateStats(cell.dataset.d);
}

// حفظ البيانات في LocalStorage
function saveData() {
    const data = [];
    const cells = document.querySelectorAll('.check-cell.completed');
    cells.forEach(cell => {
        data.push(`${cell.dataset.h}-${cell.dataset.d}`);
    });
    localStorage.setItem(storageKey, JSON.stringify(data));
}

// استرجاع البيانات
function loadData() {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) {
        saved.forEach(id => {
            const [h, d] = id.split('-');
            const cell = document.querySelector(`.check-cell[data-h="${h}"][data-d="${d}"]`);
            if (cell) cell.classList.add('completed');
        });
        // تحديث الإحصائيات لكل الأيام
        for (let d = 1; d <= totalDays; d++) {
            updateStats(d);
        }
    }
}

// تحديث العداد والرسم البياني
function updateStats(day) {
    // 1. حساب عدد العادات المكتملة في اليوم ده
    const dayCells = document.querySelectorAll(`.check-cell[data-d="${day}"].completed`);
    const count = dayCells.length;
    
    const countCell = document.getElementById(`count-${day}`);
    if(countCell) countCell.innerText = count;

    // 2. تحديث نقطة الأداء
    // الأول نمسح أي نقطة نشطة في اليوم ده
    document.querySelectorAll(`[id^="perf-"][id$="-${day}"]`).forEach(el => el.classList.remove('active'));

    // نحدد النسبة بناءً على العدد
    let pctClass = 0;
    if (count === 7) pctClass = 100;
    else if (count === 6) pctClass = 85;
    else if (count === 5) pctClass = 70;
    else if (count === 4) pctClass = 55;
    else if (count === 3) pctClass = 40;
    else if (count === 2) pctClass = 25;
    else if (count >= 1) pctClass = 10;

    // تلوين النقطة المناسبة
    if (pctClass > 0) {
        const dot = document.getElementById(`perf-${pctClass}-${day}`);
        if (dot) dot.classList.add('active');
    }
}

function resetData() {
    if (confirm("هل أنت متأكد أنك تريد مسح كل التقدم؟")) {
        localStorage.removeItem(storageKey);
        location.reload(); // إعادة تحميل الصفحة
    }
}