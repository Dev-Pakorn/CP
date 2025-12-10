/* mock-db.js (ฉบับสมบูรณ์: รองรับ PC, Software, Admin, Config, และ LOGS สำหรับ Report) */

// ==========================================
// 1. MOCK DATA (ข้อมูลจำลอง)
// ==========================================

// 1.1 ข้อมูล Admin, Zones, PC, Software (ใช้ข้อมูลเดิมที่เคยส่งมา)
const DEFAULT_PCS = [
    { id: "1", name: "PC-01", status: "available", software: ["VS Code", "Google Chrome"] },
    { id: "2", name: "PC-02", status: "in_use", currentUser: "สมชาย รักเรียน", startTime: Date.now() - 3600000, software: ["Adobe Photoshop", "Illustrator"] },
    { id: "3", name: "PC-03", status: "available", software: [] },
    { id: "4", name: "PC-04", status: "available", software: ["Python 3.12", "VS Code"] },
    { id: "5", name: "PC-05", status: "available", software: ["ChatGPT (4.0)", "Gemini"] },
    { id: "6", name: "PC-06", status: "reserved", software: [] }
];
const DEFAULT_SOFTWARE = [
    { id: "s1", name: "ChatGPT", version: "4.0", type: "AI" },
    { id: "s2", name: "Gemini", version: "Advanced", type: "AI" },
    { id: "s3", name: "VS Code", version: "Latest", type: "Software" },
    { id: "s4", name: "Python", version: "3.12", type: "Software" },
    { id: "s5", name: "Adobe Photoshop", version: "2024", type: "Software" },
    { id: "s6", name: "Google Chrome", version: "Latest", type: "Software" }
];
const DEFAULT_ADMINS = [
    { id: "a1", name: "Super Admin", user: "admin", pass: "1234", role: "Super Admin" },
    { id: "a2", name: "Staff Member", user: "staff", pass: "5678", role: "Staff" }
];
const DEFAULT_ZONES = [
    { id: "z1", name: "Zone A (General)" },
    { id: "z2", name: "Zone B (Quiet)" }
];

// 1.5 จำลอง External System: REG API (เพิ่มข้อมูลคณะเพื่อ Report)
const MOCK_REG_DB = {
    "66123456": { prefix: "นาย", name: "สมชาย รักเรียน", faculty: "วิศวกรรมศาสตร์", department: "คอมพิวเตอร์", year: "3", level: "ปริญญาตรี", role: "student" },
    "66112233": { prefix: "นางสาว", name: "มานี มีปัญญา", faculty: "วิทยาศาสตร์", department: "วิทยาการคอมพิวเตอร์", year: "2", level: "ปริญญาตรี", role: "student" },
    "66100000": { prefix: "นาย", name: "เอกภพ มั่นคง", faculty: "มนุษยศาสตร์", department: "ภาษาไทย", year: "4", level: "ปริญญาตรี", role: "student" },
    "66100001": { prefix: "นางสาว", name: "ดวงดาว ไกลโพ้น", faculty: "ศึกษาศาสตร์", department: "คณิตศาสตร์", year: "1", level: "ปริญญาตรี", role: "student" },
    "ubu_staff": { prefix: "ดร.", name: "ใจดี มีวิชา", faculty: "สำนักคอมพิวเตอร์และเครือข่าย", department: "-", year: "-", level: "บุคลากร", role: "staff" }
};

// 1.6 ✅ ข้อมูล Log จำลองสำหรับ Report (สร้าง Log ย้อนหลัง 3 เดือน)
const MOCK_REG_DB_USERS_FOR_LOG = Object.values(MOCK_REG_DB).filter(u => u.role === 'student' || u.role === 'staff');
const MOCK_SOFTWARE_FOR_LOG = DEFAULT_SOFTWARE;

function generateMockLogEntry(dateOffsetDays) {
    const user = MOCK_REG_DB_USERS_FOR_LOG[Math.floor(Math.random() * MOCK_REG_DB_USERS_FOR_LOG.length)];
    const pcId = String(Math.floor(Math.random() * 6) + 1);
    const software = MOCK_SOFTWARE_FOR_LOG[Math.floor(Math.random() * MOCK_SOFTWARE_FOR_LOG.length)];
    const softwareFullName = `${software.name} (${software.version})`;
    
    let date = new Date();
    date.setDate(date.getDate() - dateOffsetDays); 
    const startTime = date.getTime() - (Math.floor(Math.random() * 30) + 10) * 60 * 1000;
    const durationMinutes = Math.floor(Math.random() * 120) + 10;
    const endTime = startTime + durationMinutes * 60 * 1000;
    
    return {
        timestamp: new Date(endTime).toISOString(),
        action: 'END_SESSION', // การใช้งานที่สมบูรณ์
        userId: Object.keys(MOCK_REG_DB).find(key => MOCK_REG_DB[key] === user),
        userName: user.name,
        userFaculty: user.faculty, // ใช้ในการ Report แยกตามคณะ
        pcId: pcId,
        startTime: new Date(startTime).toISOString(),
        durationMinutes: durationMinutes,
        usedSoftware: [softwareFullName],
        isAIUsed: software.type === 'AI', // ใช้ในการ Report สถิติ AI
    };
}

function generateMockLogs(numLogsPerMonth) {
    let logs = [];
    const daysInLastThreeMonths = 90;
    
    for(let i = 0; i < numLogsPerMonth * 3; i++) {
        const randomDayOffset = Math.floor(Math.random() * daysInLastThreeMonths);
        logs.push(generateMockLogEntry(randomDayOffset));
    }
    return logs;
}

// สร้าง Log จำลอง 150 รายการ
const DEFAULT_LOGS = generateMockLogs(50);

// ==========================================
// 2. DATABASE LOGIC (ระบบจัดการข้อมูล)
// ==========================================

const DB = {
    getData: (key, def) => { 
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : def;
    },
    setData: (key, val) => localStorage.setItem(key, JSON.stringify(val)),

    // PC, Software, Admin, Zone functions (เหมือนเดิม)
    getPCs: () => DB.getData('ck_pcs', DEFAULT_PCS),
    savePCs: (data) => DB.setData('ck_pcs', data),
    updatePCStatus: (id, status, user = null) => { /* ... */ },
    getSoftwareLib: () => DB.getData('ck_software', DEFAULT_SOFTWARE),
    saveSoftwareLib: (data) => DB.setData('ck_software', data),
    getAdmins: () => DB.getData('ck_admins', DEFAULT_ADMINS),
    saveAdmins: (data) => DB.setData('ck_admins', data),
    getZones: () => DB.getData('ck_zones', DEFAULT_ZONES),
    saveZones: (data) => DB.setData('ck_zones', data),
    checkRegAPI: (username) => MOCK_REG_DB[username],

    // --- Logging (อัปเดตให้ใช้ DEFAULT_LOGS) ---
    saveLog: (logEntry) => {
        // ต้องตรวจสอบให้แน่ใจว่าได้ดึง Log เก่ามาก่อน (รวม Log จำลอง)
        let logs = DB.getLogs(); 
        logs.push({ 
            ...logEntry, 
            timestamp: new Date().toISOString() 
        });
        DB.setData('ck_logs', logs);
    },
    // ✅ ฟังก์ชันที่ใช้ดึง Log สำหรับ Report
    getLogs: () => DB.getData('ck_logs', DEFAULT_LOGS),

    // --- Session Management ---
    getSession: () => {
        const s = sessionStorage.getItem('ck_session');
        return s ? JSON.parse(s) : null;
    },
    setSession: (newData) => {
        const current = DB.getSession() || {};
        sessionStorage.setItem('ck_session', JSON.stringify({ ...current, ...newData }));
    },
    clearSession: () => sessionStorage.removeItem('ck_session'),
    getLogs: () => DB.getData('ck_logs', DEFAULT_LOGS)
};