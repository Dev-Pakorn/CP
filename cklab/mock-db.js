/* mock-db.js (Enhanced Data for Full Reporting) */

// ==========================================
// 1. MOCK DATA (ข้อมูลจำลอง)
// ==========================================

// ✅ 1.0 ข้อมูลรอบเวลา
const DEFAULT_AI_SLOTS = [
    { id: 1, start: "09:00", end: "10:30", label: "09:00 - 10:30", active: true },
    { id: 2, start: "10:30", end: "12:00", label: "10:30 - 12:00", active: true },
    { id: 3, start: "13:00", end: "15:00", label: "13:00 - 15:00", active: true }, 
    { id: 4, start: "15:00", end: "16:30", label: "15:00 - 16:30", active: true },
    { id: 5, start: "09:00", end: "16:30", label: "ตลอดวัน (All Day)", active: true } 
];

// 1.1 ข้อมูลการจอง (Booking)
const DEFAULT_BOOKINGS = [
    { 
        id: 'b1', 
        userId: '66123456', userName: 'สมชาย รักเรียน', 
        pcId: '1', pcName: 'PC-01', 
        date: new Date().toLocaleDateString('en-CA'), 
        startTime: '09:00', endTime: '11:00', 
        note: 'ทำโปรเจกต์จบ', 
        status: 'pending' 
    },
    { 
        id: 'b2', 
        userId: 'External', userName: 'คุณวิชัย (Guest)', 
        pcId: '5', pcName: 'PC-05', 
        date: new Date().toLocaleDateString('en-CA'), 
        startTime: '13:00', endTime: '15:00', 
        note: 'ทดสอบ AI', 
        status: 'approved' 
    }
];

// 1.2 ข้อมูล Software/AI Library (รายการครบถ้วน)
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
    { id: "s10", name: "Microsoft Office", version: "365", type: "Software" },
    { id: "s11", name: "Adobe Photoshop", version: "CC", type: "Software" },
    { id: "s12", name: "VS Code", version: "Latest", type: "Software" }
];

// 1.3 ข้อมูลเครื่องคอมพิวเตอร์
const DEFAULT_PCS = [
    { 
        id: "1", name: "PC-01", status: "available", 
        installedSoftware: ["ChatGPT (Plus)", "Claude (Pro)", "Perplexity (Pro)", "VS Code"] 
    },
    { 
        id: "2", name: "PC-02", status: "in_use", currentUser: "สมชาย รักเรียน", startTime: Date.now() - 3600000, 
        installedSoftware: ["Midjourney (Basic)", "Canva (Pro)", "Gamma (Pro)", "Adobe Photoshop"] 
    },
    { 
        id: "3", name: "PC-03", status: "available", 
        installedSoftware: ["SciSpace (Premium)", "Grammarly (Pro)", "ChatGPT (Plus)", "Microsoft Office"] 
    },
    { 
        id: "4", name: "PC-04", status: "available", 
        installedSoftware: ["Botnoi VOICE (Premium)", "Canva (Pro)", "Microsoft Office"] 
    },
    { 
        id: "5", name: "PC-05", status: "available", 
        installedSoftware: ["ChatGPT (Plus)", "Claude (Pro)", "Midjourney (Basic)", "VS Code"] 
    },
    { 
        id: "6", name: "PC-06", status: "reserved", 
        installedSoftware: ["Perplexity (Pro)", "SciSpace (Premium)", "Adobe Photoshop"] 
    }
];

// 1.4 ข้อมูลผู้ดูแลระบบ (Admins)
const DEFAULT_ADMINS = [
    { id: "a1", name: "Super Admin", user: "admin", pass: "1234", role: "Super Admin" },
    { id: "a2", name: "Staff Member", user: "staff", pass: "5678", role: "Staff" }
];

// 1.5 ข้อมูลโซนที่นั่ง (Zones)
const DEFAULT_ZONES = [
    { id: "z1", name: "Zone A (General)" },
    { id: "z2", name: "Zone B (Quiet)" }
];

// 1.6 ข้อมูล Config ทั่วไปเริ่มต้น
const DEFAULT_GENERAL_CONFIG = {
    labName: "CKLab Computer Center",
    contactEmail: "cklab@ubu.ac.th",
    labLocation: "อาคาร 4 ชั้น 2",
    maxDurationMinutes: 180 
};


// 1.7 จำลอง External System: REG API (ข้อมูลหลากหลายคณะ)
const MOCK_REG_DB = {
    "66123456": { prefix: "นาย", name: "สมชาย รักเรียน", faculty: "คณะวิศวกรรมศาสตร์", department: "คอมพิวเตอร์", year: "3", level: "ปริญญาตรี", role: "student" },
    "66112233": { prefix: "นางสาว", name: "มานี มีปัญญา", faculty: "คณะวิทยาศาสตร์", department: "วิทยาการคอมพิวเตอร์", year: "2", level: "ปริญญาตรี", role: "student" },
    "66100000": { prefix: "นาย", name: "เอกภพ มั่นคง", faculty: "คณะศิลปศาสตร์", department: "ภาษาไทย", year: "4", level: "ปริญญาตรี", role: "student" },
    "66100001": { prefix: "นางสาว", name: "ดวงดาว ไกลโพ้น", faculty: "คณะศึกษาศาสตร์", department: "คณิตศาสตร์", year: "1", level: "ปริญญาตรี", role: "student" },
    "67200000": { prefix: "นาย", name: "ผู้มาเยือน", faculty: "บุคคลภายนอก", department: "-", year: "-", level: "บุคคลทั่วไป", role: "external" },
    "ubu_staff": { prefix: "ดร.", name: "ใจดี มีวิชา", faculty: "สำนักคอมพิวเตอร์และเครือข่าย", department: "-", year: "-", level: "บุคลากร", role: "staff" },
    "staff_karnklang": { prefix: "นาย", name: "บุคลากร กองกลาง", faculty: "กองกลาง", year: "-", level: "บุคลากร", role: "staff" },
    "staff_personel": { prefix: "นาง", name: "เจ้าหน้าที่ กองการเจ้าหน้าที่", faculty: "กองการเจ้าหน้าที่", year: "-", level: "บุคลากร", role: "staff" },
    "staff_klung": { prefix: "ดร.", name: "การเงิน กองคลัง", faculty: "กองคลัง", year: "-", level: "บุคลากร", role: "staff" },
    "staff_edu_serv": { prefix: "นาย", name: "บริการ กองบริการการศึกษา", faculty: "กองบริการการศึกษา", year: "-", level: "บุคลากร", role: "staff" },
    "staff_plan": { prefix: "นาง", name: "แผนงาน กองแผนงาน", faculty: "กองแผนงาน", year: "-", level: "บุคลากร", role: "staff" },
    "66010001": { prefix: "น.ศ.", name: "นิติ ธรรม", faculty: "คณะนิติศาสตร์", year: "1", level: "ปริญญาตรี", role: "student" },
    "66020001": { prefix: "น.ศ.", name: "บริหาร จัดการ", faculty: "คณะบริหารศาสตร์", year: "2", level: "ปริญญาตรี", role: "student" },
    "66030001": { prefix: "น.ศ.", name: "พยาบาล ใจดี", faculty: "คณะพยาบาลศาสตร์", year: "3", level: "ปริญญาตรี", role: "student" },
    "66040001": { prefix: "น.ศ.", name: "เภสัช ปรุงยา", faculty: "คณะเภสัชศาสตร์", year: "4", level: "ปริญญาตรี", role: "student" },
    "66050001": { prefix: "น.ศ.", name: "รัฐศาสตร์ ปกครอง", faculty: "คณะรัฐศาสตร์", year: "1", level: "ปริญญาตรี", role: "student" },
    "66060001": { prefix: "น.ศ.", name: "วิทย์ คิดค้น", faculty: "คณะวิทยาศาสตร์", year: "2", level: "ปริญญาตรี", role: "student" },
    "66070001": { prefix: "น.ศ.", name: "วิศวะ สร้างสรรค์", faculty: "คณะวิศวกรรมศาสตร์", year: "3", level: "ปริญญาตรี", role: "student" },
    "66080001": { prefix: "น.ศ.", name: "ศิลป์ ภาษา", faculty: "คณะศิลปศาสตร์", year: "4", level: "ปริญญาตรี", role: "student" },
    "66090001": { prefix: "น.ศ.", name: "ศิลป์ ออกแบบ", faculty: "คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์", year: "1", level: "ปริญญาตรี", role: "student" },
    "66100002": { prefix: "น.ศ.", name: "ครู ศึกษา", faculty: "คณะศึกษาศาสตร์", year: "2", level: "ปริญญาตรี", role: "student" },
    "66110001": { prefix: "น.ศ.", name: "เกษตร ยั่งยืน", faculty: "คณะเกษตรศาสตร์", year: "3", level: "ปริญญาตรี", role: "student" },
    "66120001": { prefix: "น.ศ.พ.", name: "หมอ รักษา", faculty: "วิทยาลัยแพทยศาสตร์และการสาธารณสุข", year: "5", level: "ปริญญาตรี", role: "student" },
    "staff_uplace": { prefix: "จนท.", name: "ยูเพลส บริการ", faculty: "สถานปฏิบัติการโรงแรมฯ (U-Place)", year: "-", level: "บุคลากร", role: "staff" },
    "staff_council": { prefix: "อ.", name: "สภา อาจารย์", faculty: "สภาอาจารย์", year: "-", level: "บุคลากร", role: "staff" },
    "staff_audit": { prefix: "นาย", name: "ตรวจสอบ ภายใน", faculty: "สำนักงานตรวจสอบภายใน", year: "-", level: "บุคลากร", role: "staff" },
    "staff_legal": { prefix: "นิติกร", name: "กฎหมาย นิติการ", faculty: "สำนักงานนิติการ / สำนักงานกฎหมาย", year: "-", level: "บุคลากร", role: "staff" },
    "staff_physical": { prefix: "ช่าง", name: "กายภาพ สิ่งแวดล้อม", faculty: "สำนักงานบริหารกายภาพและสิ่งแวดล้อม", year: "-", level: "บุคลากร", role: "staff" },
    "staff_std_dev": { prefix: "พี่", name: "พัฒน์ นักศึกษา", faculty: "สำนักงานพัฒนานักศึกษา", year: "-", level: "บุคลากร", role: "staff" },
    "staff_inter": { prefix: "Ms.", name: "Inter Relations", faculty: "สำนักงานวิเทศสัมพันธ์", year: "-", level: "บุคลากร", role: "staff" },
    "staff_research": { prefix: "ดร.", name: "วิจัย ก้าวหน้า", faculty: "สำนักงานส่งเสริมและบริหารงานวิจัย ฯ", year: "-", level: "บุคลากร", role: "staff" },
    "staff_security": { prefix: "รปภ.", name: "ปลอดภัย หายห่วง", faculty: "สำนักงานรักษาความปลอดภัย", year: "-", level: "บุคลากร", role: "staff" },
    "staff_coop": { prefix: "จนท.", name: "ออมทรัพย์ มั่นคง", faculty: "สหกรณ์ออมทรัพย์มหาวิทยาลัยอุบลราชธานี", year: "-", level: "บุคลากร", role: "staff" },
    "staff_km": { prefix: "นักวิชาการ", name: "เรียนรู้ เคเอ็ม", faculty: "ศูนย์การจัดการความรู้ (KM)", year: "-", level: "บุคลากร", role: "staff" },
    "staff_sci_tool": { prefix: "ดร.", name: "เครื่องมือ วิทย์", faculty: "ศูนย์เครื่องมือวิทยาศาสตร์", year: "-", level: "บุคลากร", role: "staff" },
    "staff_mekong": { prefix: "นักวิจัย", name: "ลุ่มน้ำ โขง", faculty: "ศูนย์วิจัยสังคมอนุภาคลุ่มน้ำโขง ฯ", year: "-", level: "บุคลากร", role: "staff" },
    "staff_com_center": { prefix: "admin", name: "คอมพิวเตอร์ เครือข่าย", faculty: "สำนักคอมพิวเตอร์และเครือข่าย", year: "-", level: "บุคลากร", role: "staff" },
    "staff_asset": { prefix: "ผอ.", name: "ทรัพย์สิน ประโยชน์", faculty: "สำนักบริหารทรัพย์สินและสิทธิประโยชน์", year: "-", level: "บุคลากร", role: "staff" },
    "staff_library": { prefix: "บรรณารักษ์", name: "วิทย บริการ", faculty: "สำนักวิทยบริการ", year: "-", level: "บุคลากร", role: "staff" },
    "staff_scipark": { prefix: "CEO", name: "อุทยาน วิทย์", faculty: "อุทยานวิทยาศาสตร์มหาวิทยาลัยอุบลราชธานี", year: "-", level: "บุคลากร", role: "staff" },
    "staff_sesame": { prefix: "ป้า", name: "งา ยั่งยืน", faculty: "ศูนย์การเรียนรู้และพัฒนา \"งา\" เชิงเกษตรอุตสาหกรรมครัวเรือนแบบยั่งยืน", year: "-", level: "บุคลากร", role: "staff" },
    "staff_print": { prefix: "ช่าง", name: "โรงพิมพ์ ม.อุบล", faculty: "โรงพิมพ์มหาวิทยาลัยอุบลราชธานี", year: "-", level: "บุคลากร", role: "staff" }
};


// ==========================================
// 1.8 LOG GENERATION LOGIC (ส่วนสำคัญสำหรับ Report)
// ==========================================
const MOCK_REG_DB_USERS_FOR_LOG = Object.values(MOCK_REG_DB); 

// ฟังก์ชันสร้าง Log จำลองแบบกระจายตัวสมจริง
function generateRichMockLogs(count) {
    let logs = [];
    const softwareList = DEFAULT_SOFTWARE.map(s => s.name);
    
    // ตั้งค่าช่วงเวลา (ย้อนหลัง 3 เดือน)
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    for (let i = 0; i < count; i++) {
        // 1. สุ่ม User
        const user = MOCK_REG_DB_USERS_FOR_LOG[Math.floor(Math.random() * MOCK_REG_DB_USERS_FOR_LOG.length)];
        const userId = Object.keys(MOCK_REG_DB).find(key => MOCK_REG_DB[key] === user);
        
        // 2. สุ่ม PC
        const targetPC = DEFAULT_PCS[Math.floor(Math.random() * DEFAULT_PCS.length)];
        
        // 3. สุ่มวันเวลา (ให้มีความถี่ในช่วงวันธรรมดา และเวลาราชการมากกว่า)
        let logDate = new Date(threeMonthsAgo.getTime() + Math.random() * (today.getTime() - threeMonthsAgo.getTime()));
        
        // ปรับเวลาให้สมจริง (08:00 - 18:00)
        logDate.setHours(8 + Math.floor(Math.random() * 10)); 
        logDate.setMinutes(Math.floor(Math.random() * 60));

        // 4. สุ่ม Software ที่ใช้ (0-3 รายการ)
        let usedSoftwareLog = [];
        let isAILog = false;
        
        // โอกาส 70% ที่จะมีการใช้ Software
        if (Math.random() > 0.3) {
            const numApps = Math.floor(Math.random() * 3) + 1; // 1-3 apps
            for (let j = 0; j < numApps; j++) {
                const app = softwareList[Math.floor(Math.random() * softwareList.length)];
                if (!usedSoftwareLog.includes(app)) {
                    usedSoftwareLog.push(app);
                    
                    // เช็คว่าเป็น AI หรือไม่
                    const swObj = DEFAULT_SOFTWARE.find(s => s.name === app);
                    if (swObj && swObj.type === 'AI') isAILog = true;
                }
            }
        }

        // 5. คำนวณระยะเวลา (15 นาที - 3 ชั่วโมง)
        const durationMinutes = Math.floor(Math.random() * 165) + 15;
        
        // เวลาเริ่ม = เวลาจบ (timestamp) - ระยะเวลา
        const startTime = new Date(logDate.getTime() - (durationMinutes * 60 * 1000));

        // 6. คะแนนความพึงพอใจ (เน้น 4-5)
        const rand = Math.random();
        let score = 5;
        if (rand < 0.1) score = 3;
        else if (rand < 0.3) score = 4;
        else score = 5;

        logs.push({
            timestamp: logDate.toISOString(), // เวลาจบ (ใช้เป็น Time Reference หลัก)
            action: 'END_SESSION',
            userId: userId,
            userName: user.name,
            userFaculty: user.faculty,
            userLevel: user.level,
            userYear: user.year,
            userRole: user.role,
            pcId: targetPC.id,
            startTime: startTime.toISOString(),
            durationMinutes: durationMinutes,
            usedSoftware: usedSoftwareLog,
            isAIUsed: isAILog,
            satisfactionScore: score,
            comment: Math.random() > 0.8 ? "ใช้งานได้ดีครับ" : ""
        });
    }

    // เรียงลำดับตามเวลาล่าสุด
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// 🔥 สร้าง Log จำนวน 500 รายการ เพื่อให้กราฟสวยงาม
const DEFAULT_LOGS = generateRichMockLogs(500);


// ==========================================
// 2. DATABASE LOGIC (ระบบจัดการข้อมูล)
// ==========================================

const DB = {
    getData: (key, def) => { 
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : def;
    },
    setData: (key, val) => localStorage.setItem(key, JSON.stringify(val)),

    // 2.1 จัดการ Time Slots
    getAiTimeSlots: () => DB.getData('ck_ai_slots', DEFAULT_AI_SLOTS),
    saveAiTimeSlots: (data) => DB.setData('ck_ai_slots', data),

    // PC Management
    getPCs: () => DB.getData('ck_pcs', DEFAULT_PCS),
    savePCs: (data) => DB.setData('ck_pcs', data),
    
    // Update PC Status
    updatePCStatus: (id, status, user = null, options = {}) => {
        let pcs = DB.getPCs();
        let pc = pcs.find(p => String(p.id) === String(id));
        if (pc) {
            pc.status = status;
            pc.currentUser = user;
            pc.startTime = (status === 'in_use') ? Date.now() : null;
            
            if (options) {
                Object.assign(pc, options);
            }
            
            DB.savePCs(pcs);
        }
    },

    // Booking Management
    getBookings: () => DB.getData('ck_bookings', DEFAULT_BOOKINGS),
    saveBookings: (data) => DB.setData('ck_bookings', data),

    updateBookingStatus: (bookingId, newStatus) => {
        let bookings = DB.getBookings();
        const index = bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
            bookings[index].status = newStatus;
            DB.saveBookings(bookings);
        }
    },

    // Software Library
    getSoftwareLib: () => DB.getData('ck_software', DEFAULT_SOFTWARE),
    saveSoftwareLib: (data) => DB.setData('ck_software', data),

    // Admin & Zone
    getAdmins: () => DB.getData('ck_admins', DEFAULT_ADMINS),
    saveAdmins: (data) => DB.setData('ck_admins', data),
    getZones: () => DB.getData('ck_zones', DEFAULT_ZONES),
    saveZones: (data) => DB.setData('ck_zones', data),
    
    // General Config
    getGeneralConfig: () => DB.getData('ck_general_config', DEFAULT_GENERAL_CONFIG),
    saveGeneralConfig: (data) => DB.setData('ck_general_config', data),

    // System
    checkRegAPI: (username) => MOCK_REG_DB[username],
    getSession: () => {
        const s = sessionStorage.getItem('ck_session');
        return s ? JSON.parse(s) : null;
    },
    setSession: (newData) => {
        const current = DB.getSession() || {};
        sessionStorage.setItem('ck_session', JSON.stringify({ ...current, ...newData }));
    },
    clearSession: () => sessionStorage.removeItem('ck_session'),

    // Logging
    saveLog: (logEntry) => {
        let logs = DB.getLogs(); 
        logs.push({ 
            ...logEntry, 
            timestamp: new Date().toISOString() 
        });
        DB.setData('ck_logs', logs);
    },
    getLogs: () => DB.getData('ck_logs', DEFAULT_LOGS),
};