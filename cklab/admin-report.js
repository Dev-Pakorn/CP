/* admin-report.js (Final: Merged Checkboxes, Avg Stats & Realtime) */

// --- Global Variables ---
let monthlyFacultyChartInstance, monthlyOrgChartInstance;
let pieChartInstance, pcAvgChartInstance, topSoftwareChartInstance;
let allLogs;
let lastLogCount = 0; // ตัวแปรสำหรับเช็คว่าข้อมูลเปลี่ยนหรือไม่

// --- Master Lists ---
const FACULTY_LIST = ["คณะวิทยาศาสตร์", "คณะเกษตรศาสตร์", "คณะวิศวกรรมศาสตร์", "คณะศิลปศาสตร์", "คณะเภสัชศาสตร์", "คณะบริหารศาสตร์", "คณะพยาบาลศาสตร์", "วิทยาลัยแพทยศาสตร์และการสาธารณสุข", "คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์", "คณะนิติศาสตร์", "คณะรัฐศาสตร์", "คณะศึกษาศาสตร์"];
const ORG_LIST = ["สำนักคอมพิวเตอร์และเครือข่าย", "สำนักบริหารทรัพย์สินและสิทธิประโยชน์", "สำนักวิทยบริการ", "กองกลาง", "กองแผนงาน", "กองคลัง", "กองบริการการศึกษา", "กองการเจ้าหน้าที่", "สำนักงานส่งเสริมและบริหารงานวิจัย ฯ", "สำนักงานพัฒนานักศึกษา", "สำนักงานบริหารกายภาพและสิ่งแวดล้อม", "สำนักงานวิเทศสัมพันธ์", "สำนักงานกฏหมายและนิติการ", "สำนักงานตรวจสอบภายใน", "สำนักงานรักษาความปลอดภัย", "สภาอาจารย์", "สหกรณ์ออมทรัพย์มหาวิทยาลัยอุบลราชธานี", "อุทยานวิทยาศาสตร์มหาวิทยาลัยอุบลราชธานี", "ศูนย์การจัดการความรู้ (KM)", "ศูนย์การเรียนรู้และพัฒนา \"งา\" เชิงเกษตรอุตสาหกรรมครัวเรือนแบบยั่งยืน", "สถานปฏิบัติการโรงแรมฯ (U-Place)", "ศูนย์วิจัยสังคมอนุภาคลุ่มน้ำโขง ฯ", "ศูนย์เครื่องมือวิทยาศาสตร์", "โรงพิมพ์มหาวิทยาลัยอุบลราชธานี"];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const session = DB.getSession();
    // if (!session || !session.user || session.user.role !== 'admin') window.location.href = 'admin-login.html';
    
    // 1. โหลดข้อมูลครั้งแรก
    allLogs = DB.getLogs(); 
    lastLogCount = allLogs.length; 

    populateFilterOptions(allLogs); 
    autoSetDates(); // ตั้งค่าวันที่เริ่มต้น
    
    renderLifetimeStats(); 
    applyFilters(); // วาดกราฟครั้งแรก

    // 2. เริ่มระบบ Auto-Refresh (Real-time Check)
    setInterval(checkForUpdates, 5000); // เช็คทุก 5 วินาที
});

// ฟังก์ชันเช็คว่ามีข้อมูลใหม่หรือไม่
function checkForUpdates() {
    const currentLogs = DB.getLogs();
    
    // ถ้าจำนวน Log ใน DB ไม่เท่ากับที่แสดงอยู่ (แปลว่ามีคน Check-out ใหม่)
    if (currentLogs.length !== lastLogCount) {
        // console.log("New data detected! Refreshing reports...");
        allLogs = currentLogs;
        lastLogCount = currentLogs.length;

        // วาดกราฟและคำนวณตัวเลขใหม่ทั้งหมด (โดยยังคง Filter เดิมไว้)
        applyFilters();
        renderLifetimeStats();
    }
}

// ==========================================
// 1. FILTER LOGIC (UPDATED)
// ==========================================
function populateFilterOptions(logs) {
    const levels = new Set();
    const years = new Set();
    const sortThai = (a, b) => String(a).localeCompare(String(b), 'th');
    const sortNum = (a, b) => parseInt(a) - parseInt(b);

    logs.forEach(log => {
        if (log.userLevel) levels.add(log.userLevel);
        if (log.userYear && log.userYear !== '-') years.add(log.userYear);
    });

    // Populate dropdowns ที่ยังคงเหลืออยู่
    populateSelect('filterLevel', levels, sortThai); // เผื่อไว้ถ้ายังใช้
    populateSelect('filterYear', years, sortNum);   // เผื่อไว้ถ้ายังใช้
}

function populateSelect(id, set, sortFn) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(set).sort(sortFn).forEach(val => { select.innerHTML += `<option value="${val}">${val}</option>`; });
}

function getFilterParams() {
    return {
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        userType: document.getElementById('filterUserType').value,
        eduLevel: document.getElementById('filterEducationLevel') ? document.getElementById('filterEducationLevel').value : '', 
        period: document.getElementById('filterPeriod').value 
    };
}

function applyFilters() { 
    const params = getFilterParams();
    const filtered = filterLogs(allLogs, params);
    
    let mode = 'monthly'; 
    let textMode = 'รายเดือน';

    if (params.period.includes('daily')) {
        mode = 'daily';
        textMode = 'รายวัน';
    } else if (params.period.includes('yearly')) {
        mode = 'yearly';
        textMode = 'รายปี';
    }
    
    // อัปเดตหัวข้อกราฟ
    const t1 = document.getElementById('chartTitle1');
    const t2 = document.getElementById('chartTitle2');
    if(t1) t1.innerText = `1.1 สถิติผู้ใช้งาน${textMode} (คณะ/วิทยาลัย)`;
    if(t2) t2.innerText = `1.2 สถิติผู้ใช้งาน${textMode} (หน่วยงาน/อื่นๆ)`;

    initializeReports(filtered, mode); 
    renderLifetimeStats();
}

function clearFilters() { 
    document.getElementById('reportFilterForm').reset(); 
    
    // Reset Checkboxes UI
    const chkContainer = document.getElementById('dynamicCheckboxContainer');
    if(chkContainer) chkContainer.style.display = 'none';
    
    const yearContainer = document.getElementById('yearFilterContainer');
    if(yearContainer) yearContainer.classList.add('d-none');
    
    autoSetDates(); 
    applyFilters(); 
}

// ✅ [New Feature] จัดการเมื่อเปลี่ยน User Type (แสดง Checkbox)
function handleUserTypeChange() {
    const userType = document.getElementById('filterUserType').value;
    const yearContainer = document.getElementById('yearFilterContainer');
    const checkboxContainer = document.getElementById('dynamicCheckboxContainer');
    const title = document.getElementById('checkboxGroupTitle');
    
    // 1. จัดการส่วนแสดงผล "ระดับการศึกษา / ชั้นปี"
    if (yearContainer) {
        if (userType === 'Student') {
            yearContainer.classList.remove('d-none');
        } else {
            yearContainer.classList.add('d-none');
            const eduEl = document.getElementById('filterEducationLevel');
            if(eduEl) eduEl.value = '';
        }
    }

    // 2. จัดการส่วน Checkbox ตามประเภทผู้ใช้
    if (checkboxContainer && title) {
        if (userType === 'Student') {
            checkboxContainer.style.display = 'block';
            title.innerText = 'เลือกคณะ (Faculty)';
            renderCheckboxes(FACULTY_LIST); 
        } else if (userType === 'Staff') {
            checkboxContainer.style.display = 'block';
            title.innerText = 'เลือกหน่วยงาน (Organization)';
            renderCheckboxes(ORG_LIST); 
        } else {
            checkboxContainer.style.display = 'none';
        }
    }
}

// ✅ [New Feature] สร้าง Checkbox
function renderCheckboxes(list) {
    const container = document.getElementById('checkboxList');
    if(!container) return;

    const selectAll = document.getElementById('selectAllCheckboxes');
    if(selectAll) selectAll.checked = false;

    container.innerHTML = list.map(item => `
        <div class="col-md-4">
            <div class="form-check">
                <input class="form-check-input filter-checkbox" type="checkbox" value="${item}" id="chk_${item.replace(/\s/g, '')}">
                <label class="form-check-label small" for="chk_${item.replace(/\s/g, '')}">${item}</label>
            </div>
        </div>
    `).join('');
}

// ✅ [New Feature] เลือกทั้งหมด
function toggleSelectAll(master) {
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    checkboxes.forEach(cb => cb.checked = master.checked);
}

// ✅ [New Logic] กรองข้อมูลรวม Checkbox
function filterLogs(logs, params) {
    let filtered = logs;
    const { startDate, endDate, userType, eduLevel } = params;
    
    // ดึงค่าจาก Checkbox ที่ถูกเลือก
    const selectedItems = Array.from(document.querySelectorAll('.filter-checkbox:checked')).map(cb => cb.value);

    // กรองวันที่
    if (startDate) {
        filtered = filtered.filter(log => new Date(log.timestamp).toLocaleDateString('en-CA') >= startDate);
    }
    if (endDate) {
        filtered = filtered.filter(log => new Date(log.timestamp).toLocaleDateString('en-CA') <= endDate);
    }

    // กรองตาม User Type และ Checkbox
    if (userType === 'Student') {
        filtered = filtered.filter(log => log.userRole === 'student');
        
        // ถ้ามีการติ๊กเลือกคณะ
        if (selectedItems.length > 0) {
            filtered = filtered.filter(log => selectedItems.includes(log.userFaculty));
        }
        
        // กรองระดับการศึกษา
        if (eduLevel === 'Undergraduate') {
            const undergradYears = ['1', '2', '3', '4'];
            filtered = filtered.filter(log => undergradYears.includes(String(log.userYear)));
        } else if (['1', '2', '3', '4'].includes(eduLevel)) {
            filtered = filtered.filter(log => String(log.userYear) === eduLevel);
        } else if (eduLevel === 'Master') {
            filtered = filtered.filter(log => log.userLevel === 'ปริญญาโท');
        } else if (eduLevel === 'Doctoral') {
            filtered = filtered.filter(log => log.userLevel === 'ปริญญาเอก');
        }

    } else if (userType === 'Staff') {
        filtered = filtered.filter(log => log.userRole === 'staff');
        // ถ้ามีการติ๊กเลือกหน่วยงาน
        if (selectedItems.length > 0) {
            filtered = filtered.filter(log => selectedItems.includes(log.userFaculty));
        }

    } else if (userType === 'External') {
        filtered = filtered.filter(log => log.userRole === 'external');

    } else if (userType === 'Internal') {
        filtered = filtered.filter(log => log.userRole === 'student' || log.userRole === 'staff');
    }

    return filtered;
}

// ==========================================
// 2. MAIN RENDER FUNCTION & STATS PROCESSING
// ==========================================

function initializeReports(logs, mode = 'monthly') {
    // ล้างกราฟเก่า
    [monthlyFacultyChartInstance, monthlyOrgChartInstance, pieChartInstance, pcAvgChartInstance, topSoftwareChartInstance].forEach(chart => {
        if (chart) chart.destroy();
    });

    renderLogHistory(logs); // ตารางประวัติ

    const statsLogs = logs.filter(l => l.action === 'END_SESSION'); 
    const data = processLogs(statsLogs, mode);
    
    updateQuickStats(data.quickStats); // อัปเดตการ์ดสถิติ (Average)

    monthlyFacultyChartInstance = drawBeautifulLineChart(data.monthlyFacultyData, 'monthlyFacultyChart', 5, mode);
    monthlyOrgChartInstance = drawBeautifulLineChart(data.monthlyOrgData, 'monthlyOrgChart', 5, mode);
    topSoftwareChartInstance = drawTopSoftwareChart(data.softwareStats);
    pieChartInstance = drawAIUsagePieChart(data.aiUsageData); 
    pcAvgChartInstance = drawPCAvgTimeChart(data.pcAvgTimeData);
    
    drawSatisfactionChart(data.satisfactionData);
    renderFeedbackComments(statsLogs);
}

// ✅ อัปเดต Quick Stats (โชว์ค่าเฉลี่ย ตามโค้ดที่คุณต้องการ)
function updateQuickStats(stats) {
    const elTopPC = document.getElementById('statTopPC');
    const elTopPCTime = document.getElementById('statTopPCTime');
    const elAvgTime = document.getElementById('statAvgTime');

    if (elTopPC) elTopPC.innerText = stats.topPC.name;
    
    if (elTopPCTime) {
        // แสดงเป็น "เฉลี่ย ... นาที" แทน "รวม ... ชม."
        elTopPCTime.innerText = stats.topPC.value > 0 
            ? `(เฉลี่ย ${stats.topPC.value} นาที)` 
            : '';
    }
    
    if (elAvgTime) {
        if (stats.avgTime.minutes >= 60) {
            elAvgTime.innerText = `${stats.avgTime.hours} ชม.`;
        } else {
            elAvgTime.innerText = `${stats.avgTime.minutes} นาที`;
        }
    }
}

// ✅ แก้ไข processLogs ให้คำนวณ Max Average (ตามโค้ดที่คุณต้องการ)
function processLogs(logs, mode) {
    const result = {
        monthlyFacultyData: {}, monthlyOrgData: {}, aiUsageData: { ai: 0, nonAI: 0 },
        pcAvgTimeData: [], satisfactionData: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0 },
        softwareStats: {},
        quickStats: { 
            topPC: { name: '-', value: 0 }, 
            avgTime: { hours: 0, minutes: 0 } 
        }
    };
    
    const pcUsageMap = new Map();
    const allPCs = DB.getPCs(); 
    
    let globalTotalMinutes = 0;
    let globalSessionCount = 0;

    allPCs.forEach(pc => {
        pcUsageMap.set(String(pc.id), { total: 0, count: 0 });
    });

    logs.forEach(log => {
        // --- Grouping Date Logic ---
        const dateObj = new Date(log.timestamp);
        let timeKey;
        if (mode === 'daily') timeKey = dateObj.getDate().toString(); 
        else if (mode === 'yearly') timeKey = (dateObj.getFullYear() + 543).toString();
        else timeKey = dateObj.toLocaleDateString('th-TH', { year: '2-digit', month: 'short' });

        const faculty = log.userFaculty || 'Unknown';
        let target = null;
        if (FACULTY_LIST.includes(faculty) || faculty.startsWith("คณะ") || faculty.startsWith("วิทยาลัย")) target = result.monthlyFacultyData;
        else if (faculty !== "บุคคลภายนอก") target = result.monthlyOrgData;

        if (target) {
            if (!target[timeKey]) target[timeKey] = {};
            target[timeKey][faculty] = (target[timeKey][faculty] || 0) + 1;
        }

        // --- AI Usage ---
        if (log.isAIUsed) result.aiUsageData.ai++; else result.aiUsageData.nonAI++;

        // --- Software Stats ---
        if (Array.isArray(log.usedSoftware)) {
            log.usedSoftware.forEach(sw => {
                const name = sw.split('(')[0].trim();
                result.softwareStats[name] = (result.softwareStats[name] || 0) + 1;
            });
        }

        // --- PC Usage Stats ---
        const pcId = String(log.pcId);
        const duration = log.durationMinutes || 0;
        
        if (pcUsageMap.has(pcId)) {
            pcUsageMap.get(pcId).total += duration;
            pcUsageMap.get(pcId).count++;
        }

        globalTotalMinutes += duration;
        globalSessionCount++;

        // --- Satisfaction ---
        if (log.satisfactionScore) {
            const score = parseInt(log.satisfactionScore);
            if (score >= 1 && score <= 5) {
                result.satisfactionData[score]++;
                result.satisfactionData.total++;
            }
        }
    });

    // --- Calculate Top Active PC (By Average Time) ---
    let maxPcId = null;
    let maxPcAvg = -1;

    pcUsageMap.forEach((val, key) => {
        const avg = val.count > 0 ? (val.total / val.count) : 0;
        if (avg > maxPcAvg) {
            maxPcAvg = avg;
            maxPcId = key;
        }
    });

    if (maxPcId) {
        const pcInfo = allPCs.find(p => String(p.id) === maxPcId);
        result.quickStats.topPC = {
            name: pcInfo ? pcInfo.name : `PC-${maxPcId}`,
            value: maxPcAvg.toFixed(1)
        };
    }

    // --- Calculate Global Avg Time ---
    if (globalSessionCount > 0) {
        const avgMins = globalTotalMinutes / globalSessionCount;
        result.quickStats.avgTime = {
            minutes: avgMins.toFixed(0),
            hours: (avgMins / 60).toFixed(1)
        };
    }

    // --- Prepare Chart Data ---
    result.pcAvgTimeData = Array.from(pcUsageMap.entries()).map(([id, d]) => {
        const avg = d.count > 0 ? (d.total / d.count) : 0;
        const pcInfo = allPCs.find(p => String(p.id) === id);
        const pcLabel = pcInfo ? pcInfo.name : `PC-${id}`;
        return { pcId: pcLabel, avgTime: avg.toFixed(1) };
    });

    return result;
}

// ==========================================
// 3. CHART DRAWING FUNCTIONS
// ==========================================

function drawBeautifulLineChart(data, canvasId, topN = 5, mode = 'monthly') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Sort logic
    const keys = Object.keys(data).sort((a, b) => {
        if (mode === 'daily') {
            return parseInt(a) - parseInt(b);
        } else if (mode === 'yearly') {
            return parseInt(a) - parseInt(b);
        } else {
            const monthMap = { "ม.ค.":0, "ก.พ.":1, "มี.ค.":2, "เม.ย.":3, "พ.ค.":4, "มิ.ย.":5, "ก.ค.":6, "ส.ค.":7, "ก.ย.":8, "ต.ค.":9, "พ.ย.":10, "ธ.ค.":11 };
            const [mA, yA] = a.split(' '); const [mB, yB] = b.split(' ');
            if(!yA || !yB) return 0;
            if (yA !== yB) return parseInt(yA) - parseInt(yB);
            return monthMap[mA] - monthMap[mB];
        }
    });

    const totals = {};
    keys.forEach(k => Object.keys(data[k]).forEach(subKey => totals[subKey] = (totals[subKey]||0) + data[k][subKey]));
    const topKeys = Object.keys(totals).sort((a,b) => totals[b] - totals[a]).slice(0, topN);
    const others = Object.keys(totals).filter(k => !topKeys.includes(k));

    const datasets = topKeys.map((k, i) => ({
        label: k, data: keys.map(m => data[m][k] || 0),
        borderColor: getChartColor(i), backgroundColor: getChartColor(i),
        borderWidth: 2.5, tension: 0.4, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#fff', pointBorderWidth: 2, fill: false
    }));
    
    if (others.length > 0) {
        datasets.push({
            label: 'อื่นๆ', data: keys.map(m => others.reduce((s, k) => s + (data[m][k]||0), 0)),
            borderColor: '#adb5bd', backgroundColor: '#adb5bd',
            borderWidth: 2, borderDash: [5, 5], tension: 0.4, pointRadius: 0, fill: false
        });
    }

    return new Chart(ctx.getContext('2d'), {
        type: 'line', data: { labels: keys, datasets },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 15, font: { family: "'Prompt', sans-serif" } } } },
            scales: { 
                x: { grid: { display: false }, ticks: { font: { family: "'Prompt', sans-serif" } } }, 
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f0f0f0' }, ticks: { font: { family: "'Prompt', sans-serif" }, stepSize: 1 } } 
            }
        }
    });
}

function drawTopSoftwareChart(data) {
    const ctx = document.getElementById('topSoftwareChart');
    if(!ctx) return;
    const sorted = Object.entries(data).sort((a,b) => b[1] - a[1]).slice(0, 10);
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 400, 0);
    gradient.addColorStop(0, '#4e73df'); gradient.addColorStop(1, '#36b9cc');

    return new Chart(ctx, {
        type: 'bar',
        data: { labels: sorted.map(x=>x[0]), datasets: [{ label: 'จำนวนการใช้งาน', data: sorted.map(x=>x[1]), backgroundColor: gradient, borderRadius: 10, barPercentage: 0.6 }] },
        options: { 
            indexAxis: 'y', responsive: true, maintainAspectRatio: false, 
            plugins: { legend: {display:false}, tooltip: { callbacks: { label: (c) => ` ${c.raw} ครั้ง` } } }, 
            scales: { x: { beginAtZero: true, grid: { display: false }, ticks: { font: { family: "'Prompt', sans-serif" } } }, y: { grid: {display:false}, ticks: { font: { family: "'Prompt', sans-serif", weight: '500' } } } } 
        }
    });
}

function drawSatisfactionChart(data) {
    const total = data.total || 0;
    let avgScore = 0.0;
    if (total > 0) {
        const weightedSum = (data[5]*5) + (data[4]*4) + (data[3]*3) + (data[2]*2) + (data[1]*1);
        avgScore = (weightedSum / total); 
    }
    const avgDisplay = avgScore.toFixed(1);
    
    // อัปเดตตัวเลข
    const scoreEl = document.getElementById('satisfactionAvgScore');
    const countEl = document.getElementById('satisfactionTotalCount');
    const starsEl = document.getElementById('satisfactionStars');
    
    if(scoreEl) {
        let scoreClass = 'text-dark';
        let scoreText = 'ไม่มีข้อมูล';
        if (avgScore >= 4.5) { scoreClass = 'text-success'; scoreText = 'ยอดเยี่ยม (Excellent)'; }
        else if (avgScore >= 3.5) { scoreClass = 'text-primary'; scoreText = 'ดีมาก (Very Good)'; }
        else if (avgScore >= 2.5) { scoreClass = 'text-warning'; scoreText = 'ปานกลาง (Fair)'; }
        else if (avgScore > 0) { scoreClass = 'text-danger'; scoreText = 'ควรปรับปรุง (Poor)'; }

        scoreEl.className = `fw-bold mb-0 me-3 ${scoreClass}`;
        scoreEl.style.fontSize = "4rem";
        scoreEl.innerText = avgDisplay;

        let sentimentHtml = `<div class="fw-bold ${scoreClass}" style="font-size: 1.1rem;">${scoreText}</div>`;
        if(starsEl) {
            let starsHtml = '';
            for(let i=1; i<=5; i++) {
                if (i <= Math.floor(avgScore)) starsHtml += '<i class="bi bi-star-fill text-warning drop-shadow-sm"></i>';
                else if (i === Math.ceil(avgScore) && !Number.isInteger(avgScore)) starsHtml += '<i class="bi bi-star-half text-warning drop-shadow-sm"></i>';
                else starsHtml += '<i class="bi bi-star-fill text-muted opacity-25"></i>';
            }
            starsEl.innerHTML = starsHtml + sentimentHtml;
        }
    }
    if(countEl) countEl.innerText = `จากผู้ใช้งานทั้งหมด ${total.toLocaleString()} คน`;

    // อัปเดตกราฟแท่ง
    const container = document.getElementById('satisfactionProgressBars');
    if(!container) return;
    container.innerHTML = '';
    const barConfigs = { 5: { color: '#2ecc71' }, 4: { color: '#3498db' }, 3: { color: '#f1c40f' }, 2: { color: '#e67e22' }, 1: { color: '#e74c3c' } };

    for(let i=5; i>=1; i--) {
        const count = data[i] || 0;
        const percent = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
        const config = barConfigs[i];
        container.innerHTML += `
            <div class="d-flex align-items-center mb-2" style="height: 24px;">
                <div class="d-flex align-items-center justify-content-end me-2" style="width: 35px;">
                    <span class="small fw-bold text-muted me-1">${i}</span><i class="bi bi-star-fill text-warning small"></i>
                </div>
                <div class="flex-grow-1 progress" style="height: 8px; background-color: #f1f3f5; border-radius: 10px; overflow: hidden;">
                    <div class="progress-bar" style="width: ${percent}%; background-color: ${config.color}; border-radius: 10px; transition: width 1s ease;"></div>
                </div>
                <div class="ms-2 d-flex justify-content-between" style="width: 60px;">
                    <span class="small fw-bold text-dark">${percent}%</span><span class="small text-muted" style="font-size: 0.75rem;">(${count})</span>
                </div>
            </div>`;
    }
}

function drawPCAvgTimeChart(d) { 
    const ctx = document.getElementById('pcAvgTimeChart');
    if(!ctx) return;
    let labels = (d && d.length > 0) ? d.map(x=>x.pcId) : ["ไม่มีข้อมูล"];
    let values = (d && d.length > 0) ? d.map(x=>x.avgTime) : [0];
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, '#0d6efd'); gradient.addColorStop(1, '#8e2de2');

    return new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'เวลาเฉลี่ย (นาที)', data: values, backgroundColor: gradient, borderRadius: 6, barPercentage: 0.6, hoverBackgroundColor: '#0a58ca' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(13, 110, 253, 0.9)', titleFont: { family: "'Prompt', sans-serif" }, bodyFont: { family: "'Prompt', sans-serif" }, padding: 10, callbacks: { label: (c) => ` ${c.raw} นาที` } } },
            scales: { y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f0f0f0' }, ticks: { font: { family: "'Prompt', sans-serif" }, color: '#6c757d' } }, x: { grid: { display: false }, ticks: { font: { family: "'Prompt', sans-serif" }, color: '#495057' } } }
        }
    });
}

function drawAIUsagePieChart(d) { 
    return new Chart(document.getElementById('aiUsagePieChart'), { 
        type: 'doughnut', 
        data: { labels: ['AI Tools', 'General Use'], datasets: [{ data: [d.ai, d.nonAI], backgroundColor: ['#4e73df', '#e2e6ea'], borderWidth: 0 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position:'bottom', labels: { usePointStyle: true, font: { family: "'Prompt', sans-serif" } } } }, cutout: '70%' } 
    }); 
}

function getChartColor(i) { return ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'][i%6]; }

// ==========================================
// 4. TABLE, FEEDBACK & EXPORT
// ==========================================

function renderLogHistory(logs) {
    const tbody = document.getElementById('logHistoryTableBody');
    if (!tbody) return;
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted p-4">ไม่พบข้อมูล</td></tr>`;
        return;
    }
    
    const displayLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100);

    tbody.innerHTML = displayLogs.map((log, index) => {
        const userId = log.userId || '-';
        const name = log.userName || '-';
        const softwareDisplay = (Array.isArray(log.usedSoftware) && log.usedSoftware.length > 0) 
            ? log.usedSoftware.slice(0, 2).map(s => `<span class="badge bg-light text-dark border fw-normal me-1">${s}</span>`).join('') + (log.usedSoftware.length > 2 ? '...' : '') : '-';

        const end = new Date(log.timestamp);
        const start = log.startTime ? new Date(log.startTime) : end;
        const dateStr = end.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timeRange = `${start.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}`;
        const faculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '-');
        
        let roleBadge = '<span class="badge bg-secondary">ไม่ระบุ</span>';
        if (log.userRole === 'student') roleBadge = '<span class="badge bg-info text-dark">นักศึกษา</span>';
        else if (log.userRole === 'staff') roleBadge = '<span class="badge bg-warning text-dark">บุคลากร/อาจารย์</span>';
        else if (log.userRole === 'external') roleBadge = '<span class="badge bg-success">บุคคลภายนอก</span>';

        const pcName = `PC-${log.pcId || '?'}`;
        const duration = log.durationMinutes ? `${log.durationMinutes} น.` : '-';
        const satisfactionScoreDisplay = getSatisfactionDisplay(log.satisfactionScore);

        return `<tr>
            <td class="text-center">${index + 1}</td>
            <td><span class="fw-bold text-primary">${userId}</span></td>
            <td>${name}</td>
            <td>${softwareDisplay}</td>
            <td>${dateStr}</td>
            <td>${timeRange}</td>
            <td>${faculty}</td>
            <td>${roleBadge}</td>
            <td>${pcName}</td>
            <td class="text-end">${duration}</td>
            <td class="text-center">${satisfactionScoreDisplay}</td>
        </tr>`;
    }).join('');

    if (logs.length > 100) {
        tbody.innerHTML += `<tr><td colspan="11" class="text-center text-muted small p-2 bg-light">... มีข้อมูลอีก ${logs.length - 100} รายการ (กรุณากด Export Data เพื่อดูทั้งหมด) ...</td></tr>`;
    }
}

function renderFeedbackComments(logs) {
    const container = document.getElementById('feedbackCommentList');
    const countBadge = document.getElementById('commentCount');
    if (!container) return;

    const comments = logs.filter(log => log.comment && log.comment.trim() !== "");
    if(countBadge) countBadge.innerText = comments.length;

    if (comments.length === 0) {
        container.innerHTML = `<div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted mt-5"><i class="bi bi-chat-square-heart fs-1 opacity-25 mb-2"></i><p class="small">ยังไม่มีข้อเสนอแนะในขณะนี้</p></div>`;
        return;
    }

    const sortedComments = comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    container.innerHTML = sortedComments.map(log => {
        const score = parseInt(log.satisfactionScore) || 0;
        let stars = '';
        for(let i=1; i<=5; i++) stars += i <= score ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted opacity-25"></i>';
        
        const dateObj = new Date(log.timestamp);
        const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const user = log.userName || 'Unknown';
        const role = log.userRole === 'student' ? 'นักศึกษา' : (log.userRole === 'staff' ? 'บุคลากร' : 'Guest');
        let borderColor = '#dc3545'; let avatarColor = 'bg-danger';
        if (score >= 4) { borderColor = '#198754'; avatarColor = 'bg-success'; } 
        else if (score === 3) { borderColor = '#ffc107'; avatarColor = 'bg-warning text-dark'; }
        const initial = user.charAt(0).toUpperCase();

        return `
            <div class="card feedback-item border-0 shadow-sm mb-2" style="border-left: 5px solid ${borderColor} !important;">
                <div class="card-body p-3">
                    <div class="d-flex align-items-start">
                        <div class="avatar-circle ${avatarColor} bg-opacity-75 shadow-sm me-3 flex-shrink-0">${initial}</div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <div><span class="fw-bold text-dark" style="font-size: 0.95rem;">${user}</span><span class="badge bg-light text-secondary border ms-1 fw-normal" style="font-size: 0.7rem;">${role}</span></div>
                                <div class="small" style="font-size: 0.75rem;">${stars}</div>
                            </div>
                            <p class="mb-2 text-secondary" style="font-size: 0.9rem; line-height: 1.5;">"${log.comment}"</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-pc-display me-1"></i>PC-${log.pcId}</small>
                                <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-clock me-1"></i>${dateStr} ${timeStr}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function exportReport(mode) {
    const modeNames = { 'daily': 'รายวัน (Daily)', 'monthly': 'รายเดือน (Monthly)', 'quarterly': 'รายไตรมาส (Quarterly)', 'yearly': 'รายปี (Yearly)' };
    const selectedModeName = modeNames[mode] || mode;

    if (!confirm(`ยืนยันการดาวน์โหลดรายงาน "${selectedModeName}" หรือไม่?`)) return;

    const today = new Date();
    let startDate, endDate, fileNamePrefix;
    switch(mode) {
        case 'daily': startDate = new Date(today); endDate = new Date(today); fileNamePrefix = `Daily_Report_${formatDateStr(today)}`; break;
        case 'monthly': startDate = new Date(today.getFullYear(), today.getMonth(), 1); endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); fileNamePrefix = `Monthly_Report_${today.getFullYear()}_${today.getMonth()+1}`; break;
        case 'quarterly': const q = Math.floor(today.getMonth() / 3); startDate = new Date(today.getFullYear(), q * 3, 1); endDate = new Date(today.getFullYear(), (q * 3) + 3, 0); fileNamePrefix = `Quarterly_Report_${today.getFullYear()}_Q${q+1}`; break;
        case 'yearly': startDate = new Date(today.getFullYear(), 0, 1); endDate = new Date(today.getFullYear(), 11, 31); fileNamePrefix = `Yearly_Report_${today.getFullYear()}`; break;
        default: return;
    }
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);
    generateCSV(startDate, endDate, fileNamePrefix);
}

function exportCSV() {
    const filteredLogs = filterLogs(allLogs, getFilterParams());
    if (filteredLogs.length === 0) { alert("ไม่พบข้อมูล Log ตามเงื่อนไขที่เลือก"); return; }
    const fileName = `Usage_Report_${new Date().toLocaleDateString('en-CA')}`;
    createCSVFile(filteredLogs, fileName);
}

function generateCSV(startDateObj, endDateObj, fileNamePrefix) {
    const filteredLogs = allLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return logTime >= startDateObj.getTime() && logTime <= endDateObj.getTime();
    });
    if (filteredLogs.length === 0) { alert('ไม่พบข้อมูลในช่วงเวลาดังกล่าว'); return; }
    createCSVFile(filteredLogs, fileNamePrefix);
}

function createCSVFile(logs, fileName) {
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 
    const headers = ["ลำดับ", "รหัสผู้ใช้งาน", "ชื่อ-สกุล", "AI/Software ที่ใช้", "วันที่ใช้บริการ", "ช่วงเวลาใช้บริการ", "รหัสคณะ/สำนัก", "สถานะ", "PC ที่ใช้", "ระยะเวลา (นาที)", "ความพึงพอใจ (Score)"];
    const csvRows = logs.map((log, index) => {
        const userId = log.userId || '-';
        const userName = log.userName || '-';
        const software = (log.usedSoftware && log.usedSoftware.length) ? log.usedSoftware.join('; ') : '-';
        const end = new Date(log.timestamp);
        const start = log.startTime ? new Date(log.startTime) : end;
        const dateStr = end.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timeRange = `${start.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}`;
        const faculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '-');
        let role = 'บุคคลภายนอก';
        if (log.userRole === 'student') role = 'นักศึกษา';
        else if (log.userRole === 'staff') role = 'บุคลากร/อาจารย์';
        const pcName = `PC-${log.pcId || '?'}`;
        const duration = log.durationMinutes ? log.durationMinutes.toFixed(0) : '0';
        const satisfaction = log.satisfactionScore || '-';
        return [`"${index + 1}"`, `"${userId}"`, `"${userName}"`, `"${software}"`, `"${dateStr}"`, `"${timeRange}"`, `"${faculty}"`, `"${role}"`, `"${pcName}"`, `"${duration}"`, `"${satisfaction}"`].join(',');
    });
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderLifetimeStats() {
    const logs = DB.getLogs();
    const total = logs.length;
    const internal = logs.filter(l => l.userRole === 'student' || l.userRole === 'staff').length;
    const external = total - internal; 

    document.getElementById('lifetimeTotalCount').innerText = total.toLocaleString();
    if(document.getElementById('lifetimeInternal')) document.getElementById('lifetimeInternal').innerText = internal.toLocaleString();
    if(document.getElementById('lifetimeExternal')) document.getElementById('lifetimeExternal').innerText = external.toLocaleString();
    if (total > 0) {
        if(document.getElementById('progInternal')) document.getElementById('progInternal').style.width = `${(internal / total) * 100}%`;
        if(document.getElementById('progExternal')) document.getElementById('progExternal').style.width = `${(external / total) * 100}%`;
    }
}

function autoSetDates() { 
    const periodSelect = document.getElementById('filterPeriod');
    if (!periodSelect) return; 
    const p = periodSelect.value;
    const t = new Date(); 
    let s, e; 
    if (p === 'daily_31') { s = new Date(t.getFullYear(), t.getMonth(), 1); e = new Date(t.getFullYear(), t.getMonth() + 1, 0); } 
    else if (p === 'monthly_12') { s = new Date(t.getFullYear(), 0, 1); e = new Date(t.getFullYear(), 11, 31); } 
    else if (p === 'quarterly') { const q = Math.floor(t.getMonth() / 3); s = new Date(t.getFullYear(), q * 3, 1); e = new Date(t.getFullYear(), (q * 3) + 3, 0); } 
    else if (p === 'yearly_custom') { s = new Date(2025, 0, 1); e = t; } 
    else if (p === 'custom') return; 

    if (s && e) {
        document.getElementById('filterStartDate').value = formatDateForInput(s); 
        document.getElementById('filterEndDate').value = formatDateForInput(e);
        applyFilters(); 
    } 
}

function processImportCSV(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const rows = text.split('\n');
            const newLogs = [];
            
            // ข้ามบรรทัดแรก (Header) เริ่มที่ i = 1
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                
                // แกะข้อมูล CSV (ตัดเครื่องหมาย " หน้าหลัง แล้วแยกด้วย "," )
                const cols = row.slice(1, -1).split('","');
                
                // ต้องมีข้อมูลครบ 11 คอลัมน์ตามฟอร์แมต Export
                if (cols.length < 11) continue; 
                
                // [Format]: No, ID, Name, Software, Date, TimeRange, Faculty, Role, PC, Duration, Score

                // 1. แปลงวันที่ (จากไทย dd/mm/yyyy -> สากล)
                const dateParts = cols[4].split('/'); 
                if (dateParts.length !== 3) continue;
                
                let year = parseInt(dateParts[2]);
                if (year > 2400) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
                const month = parseInt(dateParts[1]) - 1; 
                const day = parseInt(dateParts[0]);

                // 2. แปลงเวลา (เอาเวลาสิ้นสุดมาเป็น Timestamp หลัก)
                const timeParts = cols[5].split(' - ');
                const endTimeStr = timeParts[1] ? timeParts[1].trim() : "00:00";
                const [endH, endM] = endTimeStr.split(':').map(Number);
                
                const timestampObj = new Date(year, month, day, endH, endM);
                
                // 3. แปลง Role กลับเป็น code
                const roleMap = { 'นักศึกษา': 'student', 'บุคลากร/อาจารย์': 'staff', 'บุคคลภายนอก': 'external' };
                const userRole = roleMap[cols[7]] || 'external';

                // 4. สร้าง Object Log
                const duration = parseInt(cols[9]) || 0;
                const usedSoftware = cols[3] !== '-' ? cols[3].split('; ') : [];

                const log = {
                    timestamp: timestampObj.toISOString(),
                    action: 'END_SESSION',
                    userId: cols[1],
                    userName: cols[2],
                    usedSoftware: usedSoftware,
                    userFaculty: cols[6],
                    userRole: userRole,
                    pcId: cols[8].replace('PC-', ''),
                    durationMinutes: duration,
                    satisfactionScore: cols[10] !== '-' ? parseInt(cols[10]) : null,
                    // คำนวณเวลาเริ่มย้อนหลัง
                    startTime: new Date(timestampObj.getTime() - (duration * 60000)).toISOString()
                };
                
                // 5. ตรวจสอบว่าใช้ AI หรือไม่ (เพื่อนำไปพลอตกราฟ Pie)
                log.isAIUsed = usedSoftware.some(sw => {
                    const s = sw.toLowerCase();
                    return s.includes('gpt') || s.includes('claude') || s.includes('ai') || s.includes('midjourney') || s.includes('botnoi');
                });

                newLogs.push(log);
            }

            if (newLogs.length > 0) {
                // บันทึกลง Mock DB
                const currentLogs = DB.getLogs();
                const allLogs = [...currentLogs, ...newLogs];
                
                DB.setData('ck_logs', allLogs);
                
                alert(`✅ นำเข้าข้อมูลสำเร็จ ${newLogs.length} รายการ\nหน้าเว็บจะรีเฟรชเพื่อแสดงผลรายงานใหม่`);
                location.reload(); 
            } else {
                alert('⚠️ ไม่พบข้อมูลที่สามารถนำเข้าได้ หรือรูปแบบไฟล์ไม่ถูกต้อง');
            }

        } catch (err) {
            console.error(err);
            alert('❌ เกิดข้อผิดพลาดในการอ่านไฟล์ CSV');
        }
    };
    
    reader.readAsText(file);
    input.value = ''; // ล้างค่า input เพื่อให้เลือกไฟล์เดิมซ้ำได้ถ้าต้องการ
}
function formatDateForInput(date) { return date.toLocaleDateString('en-CA'); } 
function formatDateStr(date) { return date.toLocaleDateString('en-CA'); } 
function getSatisfactionDisplay(score) { if (!score) return '-'; const c = score>=4?'success':(score>=2?'warning text-dark':'danger'); return `<span class="badge bg-${c}"><i class="bi bi-star-fill"></i> ${score}</span>`; }