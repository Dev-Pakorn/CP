/* feedback.js - Compatible with New Design */

let currentRate = 5; // คะแนนเริ่มต้น

// ข้อความบรรยายระดับคะแนน
const RATING_TEXTS = {
    1: "ต้องปรับปรุง",
    2: "พอใช้",
    3: "ปานกลาง",
    4: "ดี",
    5: "ยอดเยี่ยม"
};

// สีข้อความตามระดับคะแนน
const RATING_COLORS = {
    1: "#dc3545", // แดง
    2: "#dc3545",
    3: "#ffc107", // เหลือง
    4: "#28a745", // เขียว
    5: "#198754"  // เขียวเข้ม
};

document.addEventListener('DOMContentLoaded', () => {
    // เริ่มต้นที่ 5 ดาว
    setRate(5);
});

// --- 1. ฟังก์ชันจัดการดาวและการให้คะแนน ---

// เมื่อคลิกเลือกดาว
function setRate(rate) {
    currentRate = rate;
    
    // อัปเดตสีดาว (Active state)
    const stars = document.querySelectorAll('#starContainer span');
    stars.forEach((star, index) => {
        if (index < rate) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });

    // อัปเดตข้อความด้านล่าง
    updateRateText(rate);
}

// อัปเดตข้อความ (เช่น "ยอดเยี่ยม (5/5)")
function updateRateText(rate) {
    const txtElement = document.getElementById('rateText');
    if (txtElement) {
        txtElement.innerText = `${RATING_TEXTS[rate]} (${rate}/5)`;
        txtElement.style.color = RATING_COLORS[rate];
    }
}

// --- 2. ฟังก์ชันลูกเล่น (Hover Effects) ---

// เมื่อเอาเมาส์ชี้ดาว (Preview)
function hoverStar(rate) {
    const stars = document.querySelectorAll('#starContainer span');
    stars.forEach((star, index) => {
        if (index < rate) {
            star.classList.add('hover-active');
        } else {
            star.classList.remove('hover-active');
        }
    });
}

// เมื่อเอาเมาส์ออก (Reset)
function resetHover() {
    const stars = document.querySelectorAll('#starContainer span');
    stars.forEach(star => star.classList.remove('hover-active'));
}

// --- 3. ฟังก์ชันส่งข้อมูล (Submit) ---

function submitFeedback() {
    const session = DB.getSession();

    // กรณีไม่มี Session (เปิดหน้าเว็บทิ้งไว้นาน หรือเข้าผิดหน้า)
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    const pcId = session.pcId;

    // A. คืนสถานะเครื่องเป็น Available (ว่าง)
    // สำคัญมาก: ต้องทำเพื่อปลดล็อคเครื่องให้คนถัดไป
    DB.updatePCStatus(pcId, 'available');

    // B. บันทึก Log การ Check-out
    const comment = document.getElementById('comment').value.trim();
    
    DB.saveLog({
        action: 'Check-out',
        user: session.user ? session.user.name : 'Unknown',
        pcId: pcId,
        userType: session.user ? session.user.type : 'guest',
        rating: currentRate,
        comment: comment,
        duration: Date.now() - session.startTime
    });

    // C. ล้าง Session (ออกจากระบบ)
    DB.clearSession();

    // D. แจ้งเตือนและกลับหน้าแรก
    // ใช้ setTimeout เล็กน้อยเพื่อให้ UX ดูลื่นไหล
    alert("✅ บันทึกข้อมูลเรียบร้อย\nขอบคุณที่ใช้บริการ CKLab ครับ");

    // E. Redirect กลับไปหน้า Index พร้อมแนบเลขเครื่องเดิม (Kiosk Loop)
    if (pcId) {
        window.location.href = `index.html#${pcId}`;
    } else {
        window.location.href = 'index.html';
    }
}