/* admin-login.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เช็คว่าเจอ mock-db ไหม (ป้องกัน Error ถ้าลืมใส่ไฟล์ DB)
    if (typeof DB === 'undefined') {
        alert("Critical Error: ไม่พบไฟล์ mock-db.js กรุณาเช็คว่าไฟล์อยู่ในโฟลเดอร์เดียวกันหรือไม่");
        return;
    }

    // 2. เช็ค Session: ถ้าล็อกอินค้างอยู่แล้ว ให้ดีดไปหน้า Dashboard เลย
    const session = DB.getSession();
    if (session && session.user && 
       (session.user.role === 'admin' || session.user.role === 'Staff' || session.user.role === 'Super Admin')) {
        window.location.href = 'admin-monitor.html';
        return;
    }

    // 3. ตั้งค่าลิงก์ "ย้อนกลับ" (Back Link)
    const backLink = document.getElementById('backLink');
    if (backLink) {
        if (session && session.pcId) {
            // กรณี Admin เดินมากดจากเครื่อง Kiosk -> ให้กลับไปหน้าเครื่องนั้น
            backLink.href = `index.html#${session.pcId}`;
            backLink.innerHTML = `<i class="bi bi-arrow-left me-1"></i>กลับไปที่เครื่อง ${session.pcId}`;
        } else {
            // กรณีเข้าผ่านเว็บปกติ -> กลับหน้าแรก
            backLink.href = 'index.html';
        }
    }

    // 4. รองรับการกดปุ่ม Enter ที่ฟอร์ม
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // กัน Form Submit แบบปกติ
                doAdminLogin();     // เรียกฟังก์ชัน Login
            }
        });
    }
});

// --- ฟังก์ชัน Login หลัก ---
function doAdminLogin() {
    // 1. ดึงค่าจาก HTML
    const userEl = document.getElementById('admUser');
    const passEl = document.getElementById('admPass');

    if (!userEl || !passEl) {
        console.error("Error: ไม่พบ Element ID admUser หรือ admPass");
        return;
    }

    const u = userEl.value.trim();
    const p = passEl.value.trim();

    // 2. Validation เบื้องต้น
    if (!u || !p) {
        alert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        return;
    }

    console.log("Attempting login for:", u);

    // 3. ดึงข้อมูล Admin ทั้งหมดจาก Database (LocalStorage)
    const allAdmins = DB.getAdmins(); 
    
    // 4. ตรวจสอบ Username และ Password
    const foundAdmin = allAdmins.find(admin => admin.user === u && admin.pass === p);

    if (foundAdmin) {
        // ✅ Login สำเร็จ
        console.log("Login Success:", foundAdmin.name);

        // บันทึก Session (ระบุชื่อและ Role จริง)
        DB.setSession({ 
            user: { 
                name: foundAdmin.name, 
                role: foundAdmin.role 
            } 
        });

        alert(`✅ ยินดีต้อนรับคุณ ${foundAdmin.name}`);
        window.location.href = 'admin-monitor.html';

    } else {
        // ❌ Login ไม่สำเร็จ
        console.warn("Login Failed");
        alert('❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        
        // ล้างช่องรหัสผ่านเพื่อให้กรอกใหม่ง่ายขึ้น
        passEl.value = ''; 
        passEl.focus();
    }
}