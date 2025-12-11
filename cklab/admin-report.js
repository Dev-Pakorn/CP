/* admin-report.js (Updated: เพิ่ม Master List คณะ/หน่วยงาน ในตัวกรอง) */

// Global variables
let monthlyChartInstance, pieChartInstance, pcAvgChartInstance; 
let allLogs; 

// ✅ 1. รายชื่อคณะ/หน่วยงานทั้งหมด (Master List)
const MASTER_FACULTIES = [
    "กองกลาง",
    "กองการเจ้าหน้าที่",
    "กองคลัง",
    "กองบริการการศึกษา",
    "กองแผนงาน",
    "คณะนิติศาสตร์",
    "คณะบริหารศาสตร์",
    "คณะพยาบาลศาสตร์",
    "คณะเภสัชศาสตร์",
    "คณะรัฐศาสตร์",
    "คณะวิทยาศาสตร์",
    "คณะวิศวกรรมศาสตร์",
    "คณะศิลปศาสตร์",
    "คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์",
    "คณะศึกษาศาสตร์",
    "คณะเกษตรศาสตร์",
    "สถานปฏิบัติการโรงแรมฯ (U-Place)",
    "สภาอาจารย์",
    "สำนักงานตรวจสอบภายใน",
    "สำนักงานนิติการ / สำนักงานกฎหมาย",
    "สำนักงานบริหารกายภาพและสิ่งแวดล้อม",
    "สำนักงานพัฒนานักศึกษา",
    "สำนักงานวิเทศสัมพันธ์",
    "สำนักงานส่งเสริมและบริหารงานวิจัย",
    "สำนักงานรักษาความปลอดภัย",
    "ศูนย์การจัดการความรู้ (KM)",
    "ศูนย์การเรียนรู้และพัฒนา 'งา' เชิงเกษตรอุตสาหกรรมครัวเรือนแบบยั่งยืน",
    "ศูนย์เครื่องมือวิทยาศาสตร์",
    "ศูนย์วิจัยสังคมอนุภาคลุ่มน้ำโขง",
    "สหกรณ์ออมทรัพย์มหาวิทยาลัยอุบลราชธานี",
    "สำนักคอมพิวเตอร์และเครือข่าย",
    "สำนักบริหารทรัพย์สินและสิทธิประโยชน์",
    "สำนักวิทยบริการ",
    "อุทยานวิทยาศาสตร์มหาวิทยาลัยอุบลราชธานี",
    "โรงพิมพ์มหาวิทยาลัยอุบลราชธานี",
    "วิทยาลัยแพทยศาสตร์และการสาธารณสุข"
];

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        console.log("Admin session not found.");
    }
    
    allLogs = DB.getLogs(); 
    populateFilterOptions(allLogs); // สร้างตัวเลือกใน Dropdown
    initializeReports(allLogs); 
});

// ==========================================
// 0. FILTER LOGIC & INITIALIZATION
// ==========================================

function populateFilterOptions(logs) {
    // ✅ ใช้ Set โดยเริ่มจาก MASTER_FACULTIES เพื่อให้มีครบทุกคณะแน่นอน
    const faculties = new Set(MASTER_FACULTIES);
    
    const levels = new Set();
    const years = new Set();
    
    const sortAlphabetically = (a, b) => String(a).localeCompare(String(b), 'th', { sensitivity: 'base' });
    const sortNumerically = (a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (isNaN(numA) || isNaN(numB)) return sortAlphabetically(a, b);
        return numA - numB;
    };

    // วนลูป Log เพื่อเก็บข้อมูล Level และ Year (และ Faculty เพิ่มเติมถ้ามีนอกเหนือจาก Master List)
    logs.forEach(log => {
        if (log.userFaculty) faculties.add(log.userFaculty);
        if (log.userLevel) levels.add(log.userLevel);
        if (log.userYear && log.userYear !== '-') years.add(log.userYear);
    });

    // 1. สร้าง Dropdown คณะ (เรียงตามตัวอักษร)
    const facultySelect = document.getElementById('filterFaculty');
    facultySelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(faculties).sort(sortAlphabetically).forEach(f => {
        facultySelect.innerHTML += `<option value="${f}">${f}</option>`;
    });

    // 2. สร้าง Dropdown ระดับการศึกษา
    const levelSelect = document.getElementById('filterLevel');
    levelSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';
    Array.from(levels).sort(sortAlphabetically).forEach(l => {
        levelSelect.innerHTML += `<option value="${l}">${l}</option>`;
    });
    
    // 3. สร้าง Dropdown ชั้นปี
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
    initializeReports(allLogs);
}

function filterLogs(logs, params) {
    let filtered = logs;
    const { startDate, endDate, faculty, userType, level, year } = params;
    
    // 1. Date Range
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

    // 2. Faculty
    if (faculty) {
        filtered = filtered.filter(log => log.userFaculty === faculty);
    }
    
    // 3. User Type
    if (userType) {
        if (userType === 'Internal') {
            filtered = filtered.filter(log => log.userRole === 'student' || log.userRole === 'staff');
        } else if (userType === 'External') {
            filtered = filtered.filter(log => log.userRole === 'external');
        }
    }

    // 4. Level
    if (level) {
        filtered = filtered.filter(log => log.userLevel === level);
    }
    
    // 5. Year
    if (year) {
        filtered = filtered.filter(log => log.userYear === year);
    }

    return filtered;
}

// ... (ส่วน initializeReports, processLogs, Chart Functions และ renderLogHistory คงเดิม ไม่ต้องแก้) ...
// เพื่อความสะดวก ผมรวมฟังก์ชันที่เหลือไว้ให้ครบถ้วนด้านล่างนี้เลยครับ

function initializeReports(logs) {
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();
    if (pcAvgChartInstance) pcAvgChartInstance.destroy();
    
    renderLogHistory(logs); 

    const statsLogs = logs.filter(l => l.action === 'END_SESSION'); 
    
    if (statsLogs.length === 0) {
        return; 
    }

    const processedData = processLogs(statsLogs);
    
    monthlyChartInstance = drawMonthlyUserChart(processedData.monthlyFacultyData); 
    pieChartInstance = drawAIUsagePieChart(processedData.aiUsageData); 
    pcAvgChartInstance = drawPCAvgTimeChart(processedData.pcAvgTimeData);
}

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
        
        if (!monthlyFacultyData[monthYear]) monthlyFacultyData[monthYear] = {};
        monthlyFacultyData[monthYear][faculty] = (monthlyFacultyData[monthYear][faculty] || 0) + 1;

        if (log.isAIUsed) {
            aiUsageData.ai += 1;
        } else {
            aiUsageData.nonAI += 1;
        }

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
            plugins: { legend: { position: 'top' } }
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
                y: { beginAtZero: true, title: { display: true, text: 'นาที' } }
            }
        }
    });
}

function formatLogDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatLogTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString); 
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function getSatisfactionDisplay(score) {
    if (score === undefined || score === null) return '<span class="text-muted">-</span>';
    const scoreNum = parseFloat(score);
    if (scoreNum >= 4) return `<span class="badge bg-success fw-bold"><i class="bi bi-star-fill"></i> ${score}</span>`;
    else if (scoreNum >= 2) return `<span class="badge bg-warning text-dark"><i class="bi bi-star-half"></i> ${score}</span>`;
    else return `<span class="badge bg-danger"><i class="bi bi-star"></i> ${score}</span>`;
}

function renderLogHistory(logs) {
    const tbody = document.getElementById('logHistoryTableBody');
    const COLSPAN_COUNT = 10;
    
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${COLSPAN_COUNT}" class="text-center text-muted p-4">ไม่พบข้อมูลประวัติการใช้งาน</td></tr>`;
        return;
    }

    // เรียงลำดับจาก ใหม่ -> เก่า (เหมือนเดิม)
    const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    tbody.innerHTML = sortedLogs.map((log, index) => {
        
        // 1. User Info
        const displayNameOrId = log.userName || log.userId || 'N/A';
        const displayFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : 'ไม่ระบุสังกัด');
        
        const userNameDisplay = `
            <span class="fw-bold text-dark">${displayNameOrId}</span>
            <br>
            <span class="small text-muted">${displayFaculty}</span>
        `;
        
        // 2. Status
        let statusText = log.action || 'Undefined';
        let statusClass = 'bg-secondary';
        let rowClass = '';

        switch(log.action) {
            case 'START_SESSION':
                statusText = 'Check in';
                statusClass = 'bg-primary';
                rowClass = 'table-info bg-opacity-10';
                break;
            case 'END_SESSION':
                statusText = 'Check out';
                statusClass = 'bg-success';
                rowClass = 'table-success bg-opacity-10'; 
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
            default:
                 statusClass = 'bg-secondary';
                 statusText = log.action;
        }
        
        // 3. Software/AI Used
        let softUsedDisplay = '<span class="text-muted">-</span>';
        if (Array.isArray(log.usedSoftware) && log.usedSoftware.length > 0) {
            softUsedDisplay = log.usedSoftware.map(s => {
                let isAI = s.toLowerCase().includes('gpt') || s.toLowerCase().includes('ai') || s.toLowerCase().includes('gemini');
                let color = isAI ? 'bg-info text-dark border-info' : 'bg-light text-dark border';
                return `<span class="badge ${color} border fw-normal mb-1 me-1">${s}</span>`;
            }).join('');
        }
        
        // 4. Time, Duration, Score
        const startTime = log.startTime || log.timestamp;
        const endTime = log.timestamp;
        const durationText = log.durationMinutes ? `${log.durationMinutes.toFixed(0)} min` : '-';
        const satisfactionScoreDisplay = getSatisfactionDisplay(log.satisfactionScore);
        
        return `
            <tr class="${rowClass}">
                <td class="text-center">${index + 1}</td> 
                
                <td class="small text-nowrap">${formatLogDate(endTime)}</td>
                <td class="small text-nowrap">${formatLogTime(startTime)}</td>
                <td class="small text-nowrap">${formatLogTime(endTime)}</td>
                <td>${userNameDisplay}</td>
                <td><span class="badge bg-dark fw-normal">PC-${log.pcId || '-'}</span></td>
                <td>${softUsedDisplay}</td>
                <td><span class="badge ${statusClass} fw-normal">${statusText}</span></td>
                <td class="text-end text-nowrap">${durationText}</td>
                <td class="text-center">${satisfactionScoreDisplay}</td>
            </tr>
        `;
    }).join('');
}

function formatExportDateTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' +
           date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatSoftwareForCSV(softwareArray) {
    if (!Array.isArray(softwareArray) || softwareArray.length === 0) return '';
    return softwareArray.join('; '); 
}

function exportCSV() {
    // 1. ดึง Log ที่ถูกกรองอยู่ในปัจจุบัน
    const filteredLogs = filterLogs(allLogs, getFilterParams());
    
    if (filteredLogs.length === 0) {
        alert("ไม่พบข้อมูล Log ตามเงื่อนไขที่เลือกสำหรับดาวน์โหลด");
        return;
    }

    // 2. HARDCODE: กำหนดหัวตาราง
    const headers = [
        "ลำดับ", 
        "วันที่", 
        "เวลาเข้า", 
        "เวลาออก", 
        "ผู้ใช้ / ID", 
        "คณะ / สังกัด", 
        "PC ที่ใช้", 
        "AI/Software ที่ใช้", 
        "สถานะ", 
        "ระยะเวลา (นาที)", 
        "ความพึงพอใจ (Score)"
    ];
    
    // 3. Map ข้อมูล Log ให้ตรงกับหัวตาราง
    const csvRows = filteredLogs.map((log, index) => {
        
        const startTimeStr = log.startTime ? formatExportDateTime(log.startTime) : formatExportDateTime(log.timestamp);
        const endTimeStr = formatExportDateTime(log.timestamp);
        const userNameDisplay = log.userName || log.userId || '';
        const userFaculty = log.userFaculty || (log.userRole === 'external' ? 'บุคคลภายนอก' : '');
        const pcName = `PC-${log.pcId || 'N/A'}`;
        const softwareList = formatSoftwareForCSV(log.usedSoftware);
        
        // ✅ FIX: แปลงสถานะให้เป็นคำที่อ่านง่าย
        let statusText = log.action;
        if (log.action === 'START_SESSION') statusText = 'Check in';
        else if (log.action === 'END_SESSION') statusText = 'Check out';
        else if (!statusText) statusText = 'Undefined';

        const durationMinutes = log.durationMinutes ? log.durationMinutes.toFixed(0) : '';
        const satisfactionScore = log.satisfactionScore !== undefined ? log.satisfactionScore : '';

        // สร้างแถวข้อมูลตามลำดับ Header
        return [
            `"${index + 1}"`, 
            `"${endTimeStr.split(' ')[0]}"`, 
            `"${startTimeStr.split(' ')[1]}"`, 
            `"${endTimeStr.split(' ')[1]}"`, 
            `"${userNameDisplay}"`, 
            `"${userFaculty}"`,
            `"${pcName}"`, 
            `"${softwareList}"`, 
            `"${statusText}"`, // ✅ ใช้ค่าที่แปลงแล้ว
            `"${durationMinutes}"`,
            `"${satisfactionScore}"`
        ].join(',');
    });

    // 4. รวม Header กับ Rows
    const csvContent = [
        headers.join(','),
        ...csvRows
    ].join('\n');

    // 5. สร้าง Blob และ Force Download
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