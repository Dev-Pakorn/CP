/* timer.js (Final Version: No User Extend) */

let timerInterval; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. เช็ค DB
    if (typeof DB === 'undefined') {
        document.body.innerHTML = '<div class="alert alert-danger m-5 text-center"><h3>❌ Error</h3><p>ไม่พบฐานข้อมูล (DB is not defined)</p></div>';
        return;
    }

    // 2. เช็ค Session
    const session = DB.getSession();
    if (!session || !session.startTime) {
        alert('⚠️ ไม่พบข้อมูลการใช้งาน กรุณาลงชื่อเข้าใช้ใหม่');
        window.location.href = 'index.html';
        return;
    }

    // 3. แสดงข้อมูล
    const userName = session.user ? session.user.name : 'ผู้ใช้ไม่ระบุชื่อ';
    document.getElementById('userNameDisplay').innerText = userName;
    
    const pcIdDisplay = session.pcId ? session.pcId.toString().padStart(2,'0') : '??';
    document.getElementById('pcNameDisplay').innerText = `Station: PC-${pcIdDisplay}`;
    
    // 4. เลือกโหมดจับเวลา
    if (session.forceEndTime) {
        // Mode A: มีเวลาบังคับจบ (Limited Time)
        setupCountdownMode(session);
    } else {
        // Mode B: ไม่จำกัดเวลา (Unlimited)
        setupUnlimitedMode();
    }
});

// --- Setup Modes ---
function setupCountdownMode(session) {
    console.log("Mode: Countdown (Slot-based)");
    const label = document.getElementById('timerLabel');
    if(label) label.innerText = "เวลาที่เหลือในรอบนี้ (Remaining Time)";
    
    // (เอาส่วนแสดงปุ่ม btnExtend ออกแล้ว)

    updateCountdownSlot(); 
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateCountdownSlot, 1000); 
    
    // Sync
    setInterval(syncWithAdminUpdates, 5000);
}

function setupUnlimitedMode() {
    console.log("Mode: Normal Timer (Elapsed)");
    const label = document.getElementById('timerLabel');
    if(label) label.innerText = "เวลาที่ใช้งานไปแล้ว (Elapsed Time)";

    // (เอาส่วนแสดงปุ่ม btnExtend ออกแล้ว)
    
    updateTimer(); 
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000); 
    
    // Sync
    setInterval(syncWithAdminUpdates, 5000);
}

// --- Mode 1: จับเวลาเดินหน้า (Unlimited) ---
function updateTimer() {
    const session = DB.getSession(); 
    if (!session) return;
    const now = Date.now();
    let diff = now - session.startTime;
    if (diff < 0) diff = 0;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if(timerDisplay) {
        timerDisplay.innerText = formatTime(diff);
        timerDisplay.classList.remove('text-danger', 'fw-bold'); // Reset style
    }
}

// --- Mode 2: นับถอยหลัง (Countdown ตามรอบ) ---
function updateCountdownSlot() {
    const session = DB.getSession();
    // ถ้าไม่มีเวลาบังคับจบ ให้สลับไปโหมดจับเวลาปกติ (กัน Error)
    if (!session || !session.forceEndTime) {
        setupUnlimitedMode();
        return;
    }

    // 1. รับค่าเวลาจบ (จำนวนนาทีจากเที่ยงคืน) เช่น 10:30 = 630 นาที
    const endMinutesTotal = parseInt(session.forceEndTime); 
    
    // 2. สร้างเวลาเป้าหมาย (Target) โดยใช้วันที่ "ปัจจุบัน" เสมอ
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // เริ่มที่เที่ยงคืนวันนี้
    
    // บวกชั่วโมงและนาทีเข้าไป
    const targetHour = Math.floor(endMinutesTotal / 60);
    const targetMin = endMinutesTotal % 60;
    targetDate.setHours(targetHour, targetMin, 0, 0);

    // 3. คำนวณส่วนต่าง (Milliseconds)
    const diff = targetDate.getTime() - now.getTime();

    const timerDisplay = document.getElementById('timerDisplay');

    // กรณีหมดเวลาแล้ว (Diff ติดลบ)
    if (diff <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        if(timerDisplay) {
            timerDisplay.innerText = "00:00:00";
            timerDisplay.classList.add('text-danger', 'fw-bold');
            timerDisplay.classList.remove('text-dark'); // เอาสีเดิมออก
        }
        
        // หน่วงเวลาแป๊บหนึ่งก่อนเด้งเตือน (เพื่อให้เห็นเลข 00:00:00)
        setTimeout(() => {
            handleTimeUp();
        }, 500);
        return;
    }

    // อัปเดตหน้าจอปกติ
    if (timerDisplay) {
        timerDisplay.innerText = formatTime(diff);

        // เตือนช่วง 5 นาทีสุดท้าย
        if (diff < 5 * 60 * 1000) { 
            timerDisplay.classList.remove('text-dark');
            timerDisplay.classList.add('text-danger');
            
            // แสดงข้อความเตือน (ปรับข้อความใหม่ ไม่ให้บอกว่าต่อเวลา)
            showAlert('⚠️ ใกล้หมดรอบเวลาแล้ว! กรุณาบันทึกงานและเตรียมตัวเลิกใช้งาน');
            
            // เอฟเฟกต์กระพริบถ้าน้อยกว่า 1 นาที
            if (diff < 60 * 1000) {
                timerDisplay.style.opacity = (new Date().getMilliseconds() < 500) ? '1' : '0.5';
            }
        } else {
            timerDisplay.classList.remove('text-danger');
            timerDisplay.classList.add('text-dark');
            timerDisplay.style.opacity = '1';
            hideAlert();
        }
    }
}

// ✅✅✅ ฟังก์ชัน Sync ข้อมูลกับ Admin ✅✅✅
function syncWithAdminUpdates() {
    const session = DB.getSession(); 
    if (!session || !session.pcId) return;

    // อ่านข้อมูลล่าสุดจาก DB (ที่ Admin อาจจะแก้ไขแล้ว)
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(session.pcId));

    if (pc) {
        // กรณี 1: โดน Force Logout หรือสถานะเปลี่ยน
        if (pc.status !== 'in_use' || pc.currentUser !== session.user.name) {
            alert("⚠️ Admin ได้ทำการรีเซ็ตเครื่องหรือเช็คเอาท์ให้คุณแล้ว");
            DB.clearSession();
            window.location.href = 'index.html';
            return;
        }

        // กรณี 2: Admin ต่อเวลาให้ (forceEndTime ใน DB ไม่ตรงกับ Session)
        const dbForceTime = pc.forceEndTime;
        const localForceTime = session.forceEndTime;

        if (dbForceTime !== localForceTime) {
            console.log(`🔄 Time Updated! DB: ${dbForceTime}, Local: ${localForceTime}`);
            
            // อัปเดต Session ฝั่ง User ให้ตรงกับ DB
            session.forceEndTime = dbForceTime;
            DB.setSession(session);

            // รีเซ็ตโหมดการจับเวลาใหม่
            if (dbForceTime) {
                setupCountdownMode(session);
            } else {
                setupUnlimitedMode();
            }
            
            hideAlert();
        }
    }
}

// (ลบฟังก์ชัน tryExtendSession และ getCurrentSlotFromTime ออกแล้ว)

// ฟังก์ชันเมื่อเวลาหมด
function handleTimeUp() {
    // ปรับ Logic ให้ Check-out เลยโดยไม่ต้องถามเรื่องต่อเวลา
    alert("⏰ หมดเวลาการใช้งานในรอบนี้แล้ว\nระบบจะทำการ Check-out โดยอัตโนมัติ");
    doCheckout(true);
}

// --- Helpers UI ---
function formatTime(ms) {
    const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
    const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function showAlert(msg) {
    const box = document.getElementById('alertBox');
    const txt = document.getElementById('alertMsg');
    if(box && txt) {
        box.classList.remove('d-none');
        txt.innerText = msg;
    }
}

function hideAlert() {
    const box = document.getElementById('alertBox');
    if(box) box.classList.add('d-none');
}

function doCheckout(isAuto = false) {
    if (!isAuto && !confirm('คุณต้องการเลิกใช้งานและออกจากระบบใช่หรือไม่?')) return;
    if (timerInterval) clearInterval(timerInterval);

    const session = DB.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    // คำนวณเวลาที่ใช้จริง
    const endTime = Date.now();
    const durationMilliseconds = endTime - session.startTime;
    const durationMinutes = Math.round(durationMilliseconds / 60000); 

    // อัปเดตสถานะเครื่องเป็น "ว่าง"
    DB.updatePCStatus(session.pcId, 'available', null);

    // บันทึก Session เพื่อส่งไปหน้า Feedback
    session.durationMinutes = durationMinutes; 
    DB.setSession(session);
    
    window.location.href = 'feedback.html';
}