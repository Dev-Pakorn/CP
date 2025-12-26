/* mock-db.js (Super Simulator: Auto-Logic Included) */

// ==========================================
// 1. MOCK DATA (ข้อมูลตั้งต้น)
// ==========================================

const DEFAULT_AI_SLOTS = [
    { id: 1, start: "09:00", end: "10:30", label: "09:00 - 10:30", active: true },
    { id: 2, start: "10:30", end: "12:00", label: "10:30 - 12:00", active: true },
    { id: 3, start: "13:00", end: "15:00", label: "13:00 - 15:00", active: true },
    { id: 4, start: "15:00", end: "16:30", label: "15:00 - 16:30", active: true },
    { id: 5, start: "09:00", end: "16:30", label: "ตลอดวัน (All Day)", active: true }
];

// Helper: สร้างเวลาปัจจุบันและอนาคต (เพื่อการทดสอบ)
const _now = new Date();
const _nextHour = new Date(_now.getTime() + 60 * 60 * 1000);
const _fmtTime = (d) => d.toTimeString().slice(0, 5); // HH:MM

const DEFAULT_BOOKINGS = [
    // 1. จองรอบเช้า (จบไปแล้ว - เพื่อเช็ค History)
    { 
        id: 'b1', userId: '66123456', userName: 'สมชาย รักเรียน', pcId: '1', pcName: 'PC-01', 
        date: new Date().toLocaleDateString('en-CA'), startTime: '08:00', endTime: '09:00', 
        status: 'completed', softwareList: ["ChatGPT"]
    },
    // 2. จองรอบปัจจุบัน (Active Now - เพื่อเช็คสถานะ Reserved/In Use)
    { 
        id: 'b2', userId: 'External', userName: 'คุณวิชัย (Guest)', pcId: '5', pcName: 'PC-05', 
        date: new Date().toLocaleDateString('en-CA'), startTime: _fmtTime(_now), endTime: _fmtTime(_nextHour), 
        status: 'approved', softwareList: ["Midjourney"]
    },
    // 3. จองรอบหน้า (Future - เพื่อเช็ค Queue)
    { 
        id: 'b3', userId: '66112233', userName: 'มานี มีปัญญา', pcId: '5', pcName: 'PC-05', 
        date: new Date().toLocaleDateString('en-CA'), startTime: '16:00', endTime: '17:00', 
        status: 'approved', softwareList: []
    }
];

const DEFAULT_SOFTWARE = [
    { id: "s1", name: "ChatGPT", version: "Plus", type: "AI" },
    { id: "s2", name: "Claude", version: "Pro", type: "AI" },
    { id: "s3", name: "Perplexity", version: "Pro", type: "AI" },
    { id: "s4", name: "Midjourney", version: "Basic", type: "AI" },
    { id: "s5", name: "SciSpace", version: "Premium", type: "AI" },
    { id: "s6", name: "Grammarly", version: "Pro", type: "AI" },
    { id: "s7", name: "Botnoi VOICE", version: "Premium", type: "AI" },
    { id: "s8", name: "Gamma", version: "Pro", type: "AI" },
    { id: "s9", name: "Canva", version: "Pro", type: "Software" },
    { id: "s10", name: "SPSS", version: "28", type: "Software" }
];

const DEFAULT_PCS = [
    { id: "1", name: "PC-01", status: "available", installedSoftware: ["ChatGPT (Plus)", "Claude (Pro)"] },
    { id: "2", name: "PC-02", status: "in_use", currentUser: "สมชาย รักเรียน", startTime: Date.now() - 1500000, installedSoftware: ["Midjourney (Basic)"] }, // ใช้มา 25 นาที
    { id: "3", name: "PC-03", status: "maintenance", installedSoftware: ["SciSpace (Premium)"] },
    { id: "4", name: "PC-04", status: "available", installedSoftware: ["Botnoi VOICE (Premium)", "Canva (Pro)"] },
    { id: "5", name: "PC-05", status: "reserved", currentUser: "คุณวิชัย (Guest)", installedSoftware: ["ChatGPT (Plus)", "Midjourney (Basic)"] }, // ตรงกับ Booking b2
    { id: "6", name: "PC-06", status: "available", installedSoftware: [] }
];

const DEFAULT_ADMINS = [
    { id: "a1", name: "Super Admin", user: "admin", pass: "1234", role: "Super Admin" }
];

const DEFAULT_ZONES = [
    { id: "z1", name: "Zone A (General)" },
    { id: "z2", name: "Zone B (Quiet)" }
];

const DEFAULT_GENERAL_CONFIG = {
    labName: "CKLab Computer Center",
    contactEmail: "cklab@ubu.ac.th",
    labLocation: "อาคาร 4 ชั้น 2",
    maxDurationMinutes: 180 
};

// 1.7 จำลอง External System: REG API
const MOCK_REG_DB = {
    "66123456": { prefix: "นาย", name: "สมชาย รักเรียน", faculty: "วิศวกรรมศาสตร์", role: "student" },
    "66112233": { prefix: "นางสาว", name: "มานี มีปัญญา", faculty: "วิทยาศาสตร์", role: "student" },
    "staff01": { prefix: "ดร.", name: "ใจดี มีวิชา", faculty: "สำนักคอมฯ", role: "staff" }
};

// ==========================================
// 2. DATABASE LOGIC (ระบบจัดการข้อมูล + Simulator)
// ==========================================

const DB = {
    // --- Core Storage Wrapper ---
    getData: (key, def) => { 
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : def;
    },
    setData: (key, val) => {
        localStorage.setItem(key, JSON.stringify(val));
        // Trigger Storage Event for Real-time Sync within same tab (Optional but good)
        window.dispatchEvent(new Event('storage'));
    },

    // --- Booking Management ---
    getBookings: () => DB.getData('ck_bookings', DEFAULT_BOOKINGS),
    saveBookings: (data) => DB.setData('ck_bookings', data),
    
    updateBookingStatus: (id, status) => {
        let list = DB.getBookings();
        const idx = list.findIndex(b => b.id === id);
        if (idx !== -1) {
            list[idx].status = status;
            DB.saveBookings(list);
        }
    },

    // --- PC Management (With Auto-Logic) ---
    getPCs: () => {
        let pcs = DB.getData('ck_pcs', DEFAULT_PCS);
        // *SIMULATION*: ในระบบจริง Backend จะทำหน้าที่นี้
        // ตรงนี้เราแอบเช็คว่าเครื่องไหนควรจะหลุด Reserved หรือ In Use ไหม (ถ้าจำเป็น)
        return pcs; 
    },
    savePCs: (data) => DB.setData('ck_pcs', data),
    
    updatePCStatus: (id, status, user = null, options = {}) => {
        let pcs = DB.getPCs();
        let pc = pcs.find(p => String(p.id) === String(id));
        if (pc) {
            pc.status = status;
            pc.currentUser = user;
            // ถ้า In Use ให้เริ่มจับเวลาใหม่
            if (status === 'in_use') pc.startTime = Date.now();
            else if (status === 'available') { pc.startTime = null; pc.forceEndTime = null; pc.currentUser = null; }
            
            // Merge options (e.g. forceEndTime)
            if (options) Object.assign(pc, options);
            
            DB.savePCs(pcs);
        }
    },

    // --- Time Slots ---
    getAiTimeSlots: () => DB.getData('ck_ai_slots', DEFAULT_AI_SLOTS),
    saveAiTimeSlots: (data) => DB.setData('ck_ai_slots', data),

    // --- Software ---
    getSoftwareLib: () => DB.getData('ck_software', DEFAULT_SOFTWARE),
    saveSoftwareLib: (data) => DB.setData('ck_software', data),

    // --- Logs (Generate Mock if empty) ---
    getLogs: () => {
        let logs = DB.getData('ck_logs', []);
        if (logs.length === 0) {
            // Auto generate logs for demo
            logs = generateMockLogs(20); 
            DB.setData('ck_logs', logs);
        }
        return logs;
    },
    saveLog: (entry) => {
        let logs = DB.getLogs();
        logs.push({ ...entry, timestamp: new Date().toISOString() });
        DB.setData('ck_logs', logs);
    },

    // --- System & Config ---
    getAdmins: () => DB.getData('ck_admins', DEFAULT_ADMINS),
    saveAdmins: (data) => DB.setData('ck_admins', data),
    getGeneralConfig: () => DB.getData('ck_general_config', DEFAULT_GENERAL_CONFIG),
    saveGeneralConfig: (data) => DB.setData('ck_general_config', data),
    
    // --- Auth & Session ---
    checkRegAPI: (id) => MOCK_REG_DB[id],
    getSession: () => {
        const s = sessionStorage.getItem('ck_session');
        return s ? JSON.parse(s) : null;
    },
    setSession: (data) => {
        const cur = DB.getSession() || {};
        sessionStorage.setItem('ck_session', JSON.stringify({ ...cur, ...data }));
    },
    clearSession: () => sessionStorage.removeItem('ck_session'),
    
    // --- Debug / Reset Tool ---
    resetAll: () => {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    }
};

// --- Mock Generators (สำหรับสร้าง Log เทียม) ---
function generateMockLogs(count) {
    const actions = ['START_SESSION', 'END_SESSION', 'EXTEND_SESSION'];
    let logs = [];
    for(let i=0; i<count; i++) {
        logs.push({
            timestamp: new Date(Date.now() - Math.random()*1000000000).toISOString(),
            action: actions[Math.floor(Math.random()*actions.length)],
            userName: "Mock User " + i,
            pcId: "PC-0" + (Math.floor(Math.random()*6)+1),
            details: "Auto Generated Log"
        });
    }
    return logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
}