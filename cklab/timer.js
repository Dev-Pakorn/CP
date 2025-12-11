/* timer.js (ฉบับแก้ไข: เตรียมส่งข้อมูล Session ไปหน้า Feedback) */

document.addEventListener('DOMContentLoaded', () => {
    // 1. ดึงข้อมูล Session
    const session = DB.getSession();

    // ถ้าไม่มี Session (เช่น เปิดไฟล์นี้ตรงๆ โดยไม่ผ่านหน้าแรก) ให้ดีดกลับ
    if (!session || !session.startTime) {
        alert('ไม่พบข้อมูลการใช้งาน กรุณาลงชื่อเข้าใช้ใหม่');
        window.location.href = 'index.html';
        return;
    }

    // 2. แสดงข้อมูลบนหน้าจอ
    const userName = session.user ? session.user.name : 'ผู้ใช้ไม่ระบุชื่อ';
    document.getElementById('userNameDisplay').innerText = userName;
    
    // แสดงเลขเครื่อง (เช่น PC-01)
    const pcIdDisplay = session.pcId ? session.pcId.toString().padStart(2,'0') : '??';
    document.getElementById('pcNameDisplay').innerText = `Station: PC-${pcIdDisplay}`;
    
    // 3. เริ่มนับเวลา (Update ทุก 1 วินาที)
    updateTimer(); // รันครั้งแรกทันที
    setInterval(updateTimer, 1000);

    // 4. (Optional) ตรวจสอบระยะเวลาใช้งานสูงสุด
    // หากเกินเวลาที่กำหนด (เช่น 180 นาที) อาจจะแสดงแจ้งเตือน
    // const generalConfig = DB.getGeneralConfig();
    // const maxDuration = generalConfig.maxDurationMinutes || 180;


    function updateTimer() {
        const now = Date.now();
        const diff = now - session.startTime; // เวลาปัจจุบัน - เวลาเริ่ม

        // แปลงเป็น ชั่วโมง:นาที:วินาที
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

        document.getElementById('timerDisplay').innerText = `${h}:${m}:${s}`;
        
        // 5. (Optional) ตรวจสอบเวลาเกินกำหนด (เช่น เกิน 180 นาที)
        // if (diff > (maxDuration * 60000)) {
        //     // โค้ดแจ้งเตือนหรือบังคับล็อคเอาท์อัตโนมัติ
        // }
    }
});

function doCheckout() {
    if (confirm('คุณต้องการเลิกใช้งานและออกจากระบบใช่หรือไม่?')) {
        // 1. คำนวณระยะเวลาใช้งานที่ผ่านมา
        const session = DB.getSession();
        const endTime = Date.now();
        const durationMilliseconds = endTime - session.startTime;
        const durationMinutes = Math.round(durationMilliseconds / 60000); 

        // 2. บันทึกระยะเวลาลงใน Session ชั่วคราว ก่อนส่งไปหน้า Feedback
        DB.setSession({ durationMinutes: durationMinutes });
        
        // 3. ไปหน้าประเมินความพึงพอใจ (Feedback)
        window.location.href = 'feedback.html';
    }
}

// ฟังก์ชันสำหรับ Check-out ทันที (ไม่เอา Feedback)
function forceLogout() {
    const session = DB.getSession(); 
    
    if (!session) return;
    
    const pc = DB.getPCs().find(p => p.id == session.pcId);
    
    // 1. Log END_SESSION (แต่ไม่มีคะแนนความพึงพอใจ)
    DB.saveLog({
        action: 'Force Check-out',
        userId: session.user.id || 'N/A',
        userName: session.user.name || 'N/A',
        pcId: session.pcId,
        startTime: new Date(session.startTime).toISOString(),
        timestamp: new Date().toISOString(),
        durationMinutes: 0, // ตั้งเป็น 0 หรือไม่บันทึกใน Log นี้ก็ได้
        satisfactionScore: 'N/A',
        // Note: ต้องดึง userFaculty, userLevel, usedSoftware มาจาก PC Object/User Object
    });

    // 2. อัปเดตสถานะ PC กลับเป็น 'available'
    DB.updatePCStatus(session.pcId, 'available', null);

    // 3. ล้าง Session และกลับไปหน้า Check-in
    DB.clearSession();
    alert("❌ ระบบทำการล็อคเอาท์ฉุกเฉินแล้ว");
    window.location.href = 'index.html';
}