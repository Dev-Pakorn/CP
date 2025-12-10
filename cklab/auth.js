/* auth.js - Fixed Station Version (Updated with Popup) */

// ==========================================
// 🔧 SYSTEM CONFIG: ดึงเลขเครื่องจาก URL (เช่น index.html#1)
// ==========================================
function getSystemPCId() {
    if (window.location.hash) {
        let id = window.location.hash.replace('#', '').replace(/pc-/i, '');
        return parseInt(id).toString();
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('pc');
}

const FIXED_PC_ID = getSystemPCId(); 
// ==========================================

let verifiedUserData = null;
let activeTab = 'internal';

document.addEventListener('DOMContentLoaded', () => {
    // เช็คว่ามีเลขเครื่องไหม
    if (!FIXED_PC_ID) {
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center vh-100 flex-column text-center">
                <h2 class="text-danger">⚠️ ไม่พบหมายเลขเครื่อง (PC ID)</h2>
                <p class="text-muted">กรุณาระบุเลขเครื่องใน URL เพื่อเริ่มใช้งาน<br>ตัวอย่าง: <code>index.html#1</code></p>
                <a href="index.html#1" class="btn btn-primary mt-3">ทดลองเข้าใช้งานเครื่องที่ 1</a>
            </div>
        `;
        return;
    }

    checkMachineStatus();

    const extInputs = document.querySelectorAll('#formExternal input');
    extInputs.forEach(input => {
        input.addEventListener('input', validateForm);
    });
});

function checkMachineStatus() {
    const displayId = document.getElementById('fixedPcIdDisplay');
    if(displayId) displayId.innerText = `PC-${FIXED_PC_ID.padStart(2, '0')}`;

    const pc = DB.getPCs().find(p => p.id == FIXED_PC_ID);
    
    if (!pc) {
        alert(`System Error: ไม่พบการตั้งค่าเครื่องหมายเลข ${FIXED_PC_ID} ใน Database`);
        return;
    }

    // ถ้าเครื่อง In Use อยู่แล้ว ให้เด้งไปหน้า Timer เลย (Resume)
    if (pc.status === 'in_use') {
        const currentSession = DB.getSession();
        if (!currentSession || currentSession.pcId != FIXED_PC_ID) {
             DB.setSession({
                 pcId: FIXED_PC_ID,
                 user: { name: pc.currentUser || 'Unknown User' },
                 startTime: pc.startTime || Date.now()
             });
        }
        window.location.href = 'timer.html';
    } 
}

function switchTab(type) {
    activeTab = type;
    verifiedUserData = null;
    document.getElementById('tab-internal').classList.toggle('active', type === 'internal');
    document.getElementById('tab-external').classList.toggle('active', type === 'external');
    document.getElementById('formInternal').classList.toggle('d-none', type !== 'internal');
    document.getElementById('formExternal').classList.toggle('d-none', type !== 'external');
    document.getElementById('internalVerifyCard').style.display = 'none';
    document.getElementById('ubuUser').value = '';
    validateForm();
}

function verifyUBUUser() {
    const id = document.getElementById('ubuUser').value.trim();
    if(!id) return alert("กรุณากรอกรหัส");
    
    const user = DB.checkRegAPI(id);
    if (user) {
        document.getElementById('internalVerifyCard').style.display = 'block';
        document.getElementById('showName').innerText = user.prefix + user.name;
        document.getElementById('showFaculty').innerText = user.faculty;
        document.getElementById('showRole').innerText = user.role.toUpperCase();
        verifiedUserData = { ...user, id: id, type: 'internal' };
        validateForm();
    } else {
        alert("❌ ไม่พบข้อมูล (Hint: 66123456)");
        document.getElementById('internalVerifyCard').style.display = 'none';
        verifiedUserData = null;
        validateForm();
    }
}

function validateForm() {
    let isUserValid = false;
    if (activeTab === 'internal') {
        isUserValid = (verifiedUserData !== null);
    } else {
        const id = document.getElementById('extIdCard').value.trim();
        const name = document.getElementById('extName').value.trim();
        isUserValid = (id !== '' && name !== '');
    }
    const btn = document.getElementById('btnConfirm');
    if (isUserValid) {
        btn.disabled = false;
        btn.classList.replace('btn-secondary', 'btn-success');
    } else {
        btn.disabled = true;
        btn.classList.replace('btn-success', 'btn-secondary');
    }
}

// ✅ ฟังก์ชันยืนยัน (ปรับปรุงใหม่ เพิ่ม Alert)
function confirmCheckIn() {
    const pc = DB.getPCs().find(p => p.id == FIXED_PC_ID);
    if (pc.status !== 'available') {
        return alert("❌ ขออภัย เครื่องนี้ไม่พร้อมใช้งาน (สถานะ: " + pc.status + ")");
    }

    let finalUser = null;
    const usageType = document.querySelector('input[name="usageType"]:checked').value;

    if (activeTab === 'internal') {
        finalUser = verifiedUserData;
    } else {
        finalUser = {
            id: document.getElementById('extIdCard').value.trim(),
            name: document.getElementById('extName').value.trim(),
            faculty: document.getElementById('extOrg').value.trim() || 'บุคคลทั่วไป',
            role: 'guest',
            type: 'external'
        };
    }

    // 1. อัปเดต Database
    DB.updatePCStatus(FIXED_PC_ID, 'in_use', finalUser.name);
    
    // 2. บันทึก Session
    DB.setSession({ 
        user: finalUser, 
        pcId: FIXED_PC_ID, 
        startTime: Date.now(), 
        usageType: usageType 
    });

    // 3. บันทึก Log
    DB.saveLog({ 
        action: 'Check-in', 
        user: finalUser.name, 
        pcId: FIXED_PC_ID, 
        type: finalUser.type 
    });

    // 4. ✅ แสดง Popup สำเร็จ
    alert(`✅ ลงชื่อเข้าใช้งานสำเร็จ!\n\nสวัสดีคุณ ${finalUser.name}\nระบบจะเริ่มจับเวลาการใช้งาน ณ บัดนี้`);

    // 5. ไปหน้าจับเวลา
    window.location.href = 'timer.html';
}