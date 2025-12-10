/* admin-report.js (Final Fix: Stability and Chart Redraw) */

// Global variables for Chart instances and all logs (ต้องประกาศไว้ด้านบน)
let monthlyChartInstance, pieChartInstance, pcAvgChartInstance; 
let allLogs; 

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check (คงเดิม)
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        // window.location.href = 'admin-login.html'; // เปิดใช้งานเมื่อใช้งานจริง
        console.log("Admin session not found, running report view locally.");
    }
    
    allLogs = DB.getLogs(); // Load all logs once
    populateFilterOptions(allLogs);
    initializeReports(allLogs); // Initial draw with all data
});

// ==========================================
// 0. FILTER LOGIC & INITIALIZATION (คงเดิม)
// ==========================================

function populateFilterOptions(logs) {
    // ... (ฟังก์ชัน populateFilterOptions คงเดิม) ...
    const faculties = new Set();
    const levels = new Set();
    const years = new Set();
    
    const sortAlphabetically = (a, b) => String(a).localeCompare(String(b), 'th', { sensitivity: 'base' });
    const sortNumerically = (a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (isNaN(numA) || isNaN(numB)) return sortAlphabetically(a, b);
        return numA - numB;
    };

    logs.forEach(log => {
        if (log.userFaculty) faculties.add(log.userFaculty);
        if (log.userLevel) levels.add(log.userLevel);
        if (log.userYear && log.userYear !== '-') years.add(log.userYear);
    });

    const facultySelect = document.getElementById('filterFaculty');
    facultySelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(faculties).sort(sortAlphabetically).forEach(f => {
        facultySelect.innerHTML += `<option value="${f}">${f}</option>`;
    });

    const levelSelect = document.getElementById('filterLevel');
    levelSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(levels).sort(sortAlphabetically).forEach(l => {
        levelSelect.innerHTML += `<option value="${l}">${l}</option>`;
    });
    
    const yearSelect = document.getElementById('filterYear');
    yearSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(years).sort(sortNumerically).forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });
}

function getFilterParams() {
    return {
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
        faculty: document.getElementById('filterFaculty').value,
        userType: document.getElementById('filterUserType').value,
        level: document.getElementById('filterLevel').value,
        year: document.getElementById('filterYear').value,
    };
}

function applyFilters() {
    const params = getFilterParams();
    const filteredLogs = filterLogs(allLogs, params);
    initializeReports(filteredLogs); 
    console.log(`Reports updated with ${filteredLogs.length} logs.`);
}

function clearFilters() {
    document.getElementById('reportFilterForm').reset();
    initializeReports(allLogs); // ใช้นำเข้าข้อมูลทั้งหมด (allLogs)
}

function filterLogs(logs, params) {
    let filtered = logs;
    const { startDate, endDate, faculty, userType, level, year } = params;
    
    // 1. Date Range Filter
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= start.getTime());
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= end.getTime());
    }

    // 2. Faculty Filter
    if (faculty) {
        filtered = filtered.filter(log => log.userFaculty === faculty);
    }
    
    // 3. User Type Filter
    if (userType) {
        if (userType === 'Internal') {
            filtered = filtered.filter(log => log.userRole === 'student' || log.userRole === 'staff');
        } else if (userType === 'External') {
            filtered = filtered.filter(log => log.userRole === 'external');
        }
    }

    // 4. Level Filter
    if (level) {
        filtered = filtered.filter(log => log.userLevel === level);
    }
    
    // 5. Year Filter
    if (year) {
        filtered = filtered.filter(log => log.userYear === year);
    }

    return filtered;
}

// Main function to initialize (or re-initialize) reports (FIXED)
function initializeReports(logs) {
    // 🔥 CRITICAL FIX: ทำลายกราฟเก่าก่อนวาดใหม่ทุกครั้ง
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();
    if (pcAvgChartInstance) pcAvgChartInstance.destroy();
    
    // Render Log Table (ไม่ขึ้นกับ END_SESSION)
    renderLogHistory(logs); 

    // กรองเอาเฉพาะ Log ที่จบ Session แล้ว สำหรับคำนวณสถิติ
    const statsLogs = logs.filter(l => l.action === 'END_SESSION'); 
    
    if (statsLogs.length === 0) {
        console.warn("Not enough completed sessions for charting.");
        // ถ้าไม่มีข้อมูล ให้วาดกราฟเปล่า (ถ้า canvas ยังอยู่)
        // Note: Chart.js 4+ จะจัดการแสดงผลว่างเปล่าได้ดีขึ้น
        return; 
    }

    const processedData = processLogs(statsLogs);
    
    // Draw charts and cache instances
    monthlyChartInstance = drawMonthlyUserChart(processedData.monthlyFacultyData); 
    pieChartInstance = drawAIUsagePieChart(processedData.aiUsageData); 
    pcAvgChartInstance = drawPCAvgTimeChart(processedData.pcAvgTimeData);
}


// ==========================================
// 1. DATA PROCESSING LOGIC (คงเดิม)
// ==========================================

function processLogs(filteredStatsLogs) {
    const monthlyFacultyData = {};
    const aiUsageData = { ai: 0, nonAI: 0 };
    const pcUsageMap = new Map();

    filteredStatsLogs.forEach(log => {
        const date = new Date(log.timestamp);
        const monthYear = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
        const faculty = log.userFaculty || 'Unknown';
        const duration = log.durationMinutes || 0;
        const pcId = log.pcId || 'Unknown';
        
        // 1.1 Monthly Faculty
        if (!monthlyFacultyData[monthYear]) monthlyFacultyData[monthYear] = {};
        monthlyFacultyData[monthYear][faculty] = (monthlyFacultyData[monthYear][faculty] || 0) + 1;

        // 1.2 AI Usage
        if (log.isAIUsed) {
            aiUsageData.ai += 1;
        } else {
            aiUsageData.nonAI += 1;
        }

        // 1.3 PC Avg Time
        if (!pcUsageMap.has(pcId)) {
            pcUsageMap.set(pcId, { totalDuration: 0, count: 0 });
        }
        pcUsageMap.get(pcId).totalDuration += duration;
        pcUsageMap.get(pcId).count += 1;
    });

    const pcAvgTimeData = Array.from(pcUsageMap.entries()).map(([pcId, data]) => ({
        pcId: `PC-${pcId}`,
        avgTime: (data.totalDuration / data.count).toFixed(1)
    }));

    return { monthlyFacultyData, aiUsageData, pcAvgTimeData };
}

// ==========================================
// 2. CHART DRAWING FUNCTIONS (คงเดิม)
// ==========================================

const CHART_COLORS = [
    'rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)', 'rgba(255, 206, 86, 0.8)', 
    'rgba(75, 192, 192, 0.8)', 'rgba(153, 102, 255, 0.8)', 'rgba(255, 159, 64, 0.8)',
    'rgba(199, 199, 199, 0.8)', 'rgba(83, 109, 254, 0.8)', 'rgba(255, 99, 71, 0.8)'
];

function drawMonthlyUserChart(data) {
    const ctx = document.getElementById('monthlyUserChart').getContext('2d');
    const labels = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
    const allFaculties = Array.from(new Set(Object.values(data).flatMap(Object.keys)));
    
    const datasets = allFaculties.map((faculty, index) => {
        return {
            label: faculty,
            data: labels.map(month => data[month][faculty] || 0),
            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
            stack: 'Stack 0',
        };
    });

    return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, title: { display: true, text: 'เดือน' } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'จำนวนครั้ง (Sessions)' } }
            },
            plugins: { legend: { display: allFaculties.length > 1 } }
        }
    });
}

function drawAIUsagePieChart(data) {
    const ctx = document.getElementById('aiUsagePieChart').getContext('2d');
    const total = data.ai + data.nonAI;
    const labels = [
        `ใช้ AI Tools (${((data.ai/total)*100).toFixed(1)}%)`, 
        `ใช้ Software ทั่วไป (${((data.nonAI/total)*100).toFixed(1)}%)`
    ];
    
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: [data.ai, data.nonAI],
                backgroundColor: ['#42A5F5', '#FF6384'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

function drawPCAvgTimeChart(data) {
    const ctx = document.getElementById('pcAvgTimeChart').getContext('2d');
    const labels = data.map(d => d.pcId);
    const avgTimes = data.map(d => d.avgTime);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'เวลาใช้งานเฉลี่ย (นาที)',
                data: avgTimes,
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'นาที' }
                }
            }
        }
    });
}

// ==========================================
// 3. LOG HISTORY RENDERING (คงเดิม)
// ==========================================

function formatLogDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}
function formatLogTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

function renderLogHistory(logs) {
    const tbody = document.getElementById('logHistoryTableBody');
    const COLSPAN_COUNT = 9; 
    
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${COLSPAN_COUNT}" class="text-center text-muted p-4">ไม่พบข้อมูลประวัติการใช้งาน</td></tr>`;
        return;
    }

    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tbody.innerHTML = sortedLogs.map((log, index) => {
        
        const displayNameOrId = log.userName || log.userId || 'N/A';
        const displayFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : 'ไม่ระบุสังกัด');
        
        const userNameDisplay = `
            <span class="fw-bold text-dark">${displayNameOrId}</span>
            <br>
            <span class="small text-muted">${displayFaculty}</span>
        `;
        
        let statusText = log.action || 'Undefined';
        let statusClass = 'bg-secondary';
        let rowClass = '';

        switch(log.action) {
            case 'START_SESSION':
                statusText = 'เริ่มต้นใช้งาน';
                statusClass = 'bg-primary';
                rowClass = 'table-info bg-opacity-10';
                break;
            case 'END_SESSION':
                statusText = 'สิ้นสุด Session';
                statusClass = 'bg-success';
                break;
            case 'Admin Check-in':
                statusText = 'Admin Check-in';
                statusClass = 'bg-warning text-dark';
                rowClass = 'table-warning bg-opacity-10';
                break;
            case 'Force Check-out':
                statusText = 'Force Check-out';
                statusClass = 'bg-danger';
                rowClass = 'table-danger bg-opacity-10';
                break;
        }
        
        let softUsedDisplay = '<span class="text-muted">-</span>';
        if (Array.isArray(log.usedSoftware) && log.usedSoftware.length > 0) {
            softUsedDisplay = log.usedSoftware.map(s => {
                let isAI = s.toLowerCase().includes('gpt') || s.toLowerCase().includes('ai') || s.toLowerCase().includes('gemini');
                let color = isAI ? 'bg-info text-dark border-info' : 'bg-light text-dark border';
                return `<span class="badge ${color} border fw-normal mb-1 me-1">${s}</span>`;
            }).join('');
        }
        
        const startTime = log.startTime || log.timestamp;
        const endTime = log.timestamp;
        const durationText = log.durationMinutes ? `${log.durationMinutes.toFixed(0)} min` : '-';
        
        return `
            <tr class="${rowClass}">
                <td class="text-center">${sortedLogs.length - index}</td>
                <td class="small text-nowrap">${formatLogDate(endTime)}</td>
                <td class="small text-nowrap">${formatLogTime(startTime)}</td>
                <td class="small text-nowrap">${formatLogTime(endTime)}</td>
                <td>${userNameDisplay}</td>
                <td><span class="badge bg-dark fw-normal">PC-${log.pcId || '-'}</span></td>
                <td>${softUsedDisplay}</td>
                <td><span class="badge ${statusClass} fw-normal">${statusText}</span></td>
                <td class="text-end text-nowrap">${durationText}</td>
            </tr>
        `;
    }).join('');
}


// Helper function: จัดรูปแบบวันที่และเวลาสำหรับการ Export
function formatExportDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    // ใช้รูปแบบ ISO เพื่อความแม่นยำในไฟล์ CSV (yyyy-mm-dd HH:MM)
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Helper function: จัดรูปแบบ Software List สำหรับคอลัมน์เดียว
function formatSoftwareForCSV(softwareArray) {
    if (!Array.isArray(softwareArray) || softwareArray.length === 0) return '';
    // รวมรายการ Software ด้วยเครื่องหมาย ; แทน , เพื่อไม่ให้ CSV คอลัมน์เพี้ยน
    return softwareArray.join('; '); 
}

// ==========================================
// 4. EXPORT CSV FUNCTION (FIXED HEADERS)
// ==========================================

function exportCSV() {
    // 1. ดึง Log ที่ถูกกรองอยู่ในปัจจุบัน
    const filteredLogs = filterLogs(allLogs, getFilterParams());
    
    if (filteredLogs.length === 0) {
        alert("ไม่พบข้อมูล Log ตามเงื่อนไขที่เลือกสำหรับดาวน์โหลด");
        return;
    }

    // ✅ HARDCODE: กำหนดหัวตารางตามที่คุณต้องการ
    const headers = [
        "ลำดับ", 
        "วันที่", 
        "เวลาเข้า", 
        "เวลาออก", 
        "ผู้ใช้ / ID", 
        "คณะ / สังกัด", // เพิ่มคณะ/สังกัดให้ครบ
        "PC ที่ใช้", 
        "AI/Software ที่ใช้", 
        "สถานะ", 
        "ระยะเวลา (นาที)"
    ];
    
    // 2. Map ข้อมูล Log ให้ตรงกับหัวตาราง
    const csvRows = filteredLogs.map((log, index) => {
        
        // เตรียมข้อมูลที่จำเป็น
        const startTimeStr = log.startTime ? formatExportDateTime(log.startTime) : formatExportDateTime(log.timestamp);
        const endTimeStr = formatExportDateTime(log.timestamp);
        const userNameDisplay = log.userName || log.userId || '';
        const userFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '');
        const pcName = `PC-${log.pcId || 'N/A'}`;
        const softwareList = formatSoftwareForCSV(log.usedSoftware);
        const statusText = log.action || 'Undefined';
        const durationMinutes = log.durationMinutes ? log.durationMinutes.toFixed(0) : '';

        // สร้างแถวข้อมูลตามลำดับ Header
        return [
            // ลำดับ (1, 2, 3...)
            `"${index + 1}"`, 
            // วันที่ (ดึงจากเวลาออก)
            `"${endTimeStr.split(' ')[0]}"`, 
            // เวลาเข้า
            `"${startTimeStr.split(' ')[1]}"`, 
            // เวลาออก
            `"${endTimeStr.split(' ')[1]}"`, 
            // ผู้ใช้ / ID
            `"${userNameDisplay}"`, 
            // คณะ / สังกัด
            `"${userFaculty}"`,
            // PC ที่ใช้
            `"${pcName}"`, 
            // AI/Software ที่ใช้
            `"${softwareList}"`, 
            // สถานะ
            `"${statusText}"`, 
            // ระยะเวลา (นาที)
            `"${durationMinutes}"`
        ].join(',');
    });

    // 3. รวม Header กับ Rows
    const csvContent = [
        headers.join(','),
        ...csvRows
    ].join('\n');

    // 4. สร้าง Blob และ Force Download
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Usage_Report_Filtered_${new Date().toISOString().slice(0, 10)}.csv`); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(`✅ ดาวน์โหลดไฟล์ CSV ${filteredLogs.length} รายการ เรียบร้อยแล้ว`);
    }
}