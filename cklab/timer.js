/* timer.js */
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
    if(session.user) {
        document.getElementById('userNameDisplay').innerText = session.user.name;
    }
    
    // แสดงเลขเครื่อง (เช่น PC-01)
    document.getElementById('pcNameDisplay').innerText = `Station: PC-${session.pcId ? session.pcId.toString().padStart(2,'0') : '??'}`;

    // 3. เริ่มนับเวลา (Update ทุก 1 วินาที)
    updateTimer(); // รันครั้งแรกทันที
    setInterval(updateTimer, 1000);

    function updateTimer() {
        const now = Date.now();
        const diff = now - session.startTime; // เวลาปัจจุบัน - เวลาเริ่ม

        // แปลงเป็น ชั่วโมง:นาที:วินาที
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

        document.getElementById('timerDisplay').innerText = `${h}:${m}:${s}`;
    }
});

function doCheckout() {
    if (confirm('คุณต้องการเลิกใช้งานและออกจากระบบใช่หรือไม่?')) {
        // ไปหน้าประเมินความพึงพอใจ (Feedback)
        window.location.href = 'feedback.html';
    }
}