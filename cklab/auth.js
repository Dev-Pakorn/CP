/* auth.js - Fixed Station Version (Updated with Full Data Sync) */

// ==========================================
// 🔧 SYSTEM CONFIG: ดึงเลขเครื่องจาก URL (เช่น index.html?pc=1)
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

let verifiedUserData = null; // เก็บข้อมูลผู้ใช้ที่ Verify แล้ว (Internal)
let activeTab = 'internal';

document.addEventListener('DOMContentLoaded', () => {
    // เช็คว่ามีเลขเครื่องไหม
    if (!FIXED_PC_ID || isNaN(parseInt(FIXED_PC_ID))) {
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center vh-100 flex-column text-center">
                <h2 class="text-danger">⚠️ ไม่พบหมายเลขเครื่อง (PC ID)</h2>
                <p class="text-muted">กรุณาระบุเลขเครื่องใน URL เพื่อเริ่มใช้งาน<br>ตัวอย่าง: <code>index.html?pc=1</code></p>
                <a href="index.html?pc=1" class="btn btn-primary mt-3">ทดลองเข้าใช้งานเครื่องที่ 1</a>
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
    
    // อัปเดตสถานะ Dot
    const indicator = document.querySelector('.status-indicator');
    if(indicator) {
        indicator.className = 'status-indicator'; // Reset class
        indicator.classList.add(
            `bg-${pc.status === 'available' ? 'success' : 
                   pc.status === 'in_use' ? 'danger' : 
                   pc.status === 'reserved' ? 'warning' : 'secondary'}`
        );
        indicator.title = pc.status.toUpperCase();
    }
    

    // ถ้าเครื่อง In Use อยู่แล้ว ให้เด้งไปหน้า Timer เลย (Resume)
    if (pc.status === 'in_use') {
         // สร้าง Session ชั่วคราว ถ้ายังไม่มี
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
    
    // Reset Form สำหรับ Internal
    if (type === 'internal') {
        document.getElementById('ubuUser').value = '';
    }

    validateForm();
}

function verifyUBUUser() {
    const id = document.getElementById('ubuUser').value.trim();
    if(!id) return alert("กรุณากรอกรหัส");
    
    const user = DB.checkRegAPI(id);
    const verifyCard = document.getElementById('internalVerifyCard');
    
    if (user) {
        // ✅ ข้อมูล User สมบูรณ์
        verifiedUserData = { 
            id: id, 
            name: user.prefix + user.name, 
            faculty: user.faculty, 
            role: user.role, 
            level: user.level, 
            year: user.year 
        };

        document.getElementById('showName').innerText = verifiedUserData.name;
        document.getElementById('showFaculty').innerText = verifiedUserData.faculty;
        document.getElementById('showRole').innerText = verifiedUserData.role.toUpperCase();
        
        verifyCard.style.display = 'block';
        validateForm();
    } else {
        alert("❌ ไม่พบข้อมูล (Hint: 66123456)");
        verifyCard.style.display = 'none';
        verifiedUserData = null;
        validateForm();
    }
}

function validateForm() {
    let isUserValid = false;
    const btn = document.getElementById('btnConfirm');
    
    if (activeTab === 'internal') {
        isUserValid = (verifiedUserData !== null);
    } else {
        const id = document.getElementById('extIdCard').value.trim();
        const name = document.getElementById('extName').value.trim();
        isUserValid = (id !== '' && name !== '');
    }
    
    // ตรวจสอบสถานะเครื่องอีกครั้ง
    const pc = DB.getPCs().find(p => p.id == FIXED_PC_ID);
    const isMachineAvailable = pc && pc.status === 'available';

    if (isUserValid && isMachineAvailable) {
        btn.disabled = false;
        btn.classList.replace('btn-secondary', 'btn-success');
    } else {
        btn.disabled = true;
        btn.classList.replace('btn-success', 'btn-secondary');
        if (!isMachineAvailable) {
            btn.textContent = `❌ PC-${FIXED_PC_ID} ไม่ว่าง`;
        } else {
            btn.textContent = 'เข้าสู่ระบบและเริ่มใช้งาน';
        }
    }
}

// ✅ ฟังก์ชันยืนยัน (ปรับปรุงการบันทึก Log ให้สมบูรณ์)
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
        // สร้าง Object ผู้ใช้ภายนอก
        finalUser = {
            id: document.getElementById('extIdCard').value.trim(),
            name: document.getElementById('extName').value.trim(),
            faculty: document.getElementById('extOrg').value.trim() || 'บุคคลทั่วไป',
            role: 'external',
            level: 'N/A',
            year: 'N/A'
        };
    }

    // 1. อัปเดต Database
    const startTime = Date.now();
    DB.updatePCStatus(FIXED_PC_ID, 'in_use', finalUser.name);
    
    // 2. บันทึก Session
    DB.setSession({ 
        user: finalUser, 
        pcId: FIXED_PC_ID, 
        startTime: startTime, 
        usageType: usageType 
    });

    // 3. ✅ บันทึก Log แบบละเอียด (Log History)
    // ใช้ข้อมูลที่ดึงมาทั้งหมดเพื่อให้ Report และ Log History สมบูรณ์
    DB.saveLog({ 
        action: 'START_SESSION', 
        userId: finalUser.id, 
        userName: finalUser.name, 
        userFaculty: finalUser.faculty,
        userLevel: finalUser.level,
        userYear: finalUser.year,
        userRole: finalUser.role,
        pcId: FIXED_PC_ID, 
        startTime: new Date(startTime).toISOString(),
        durationMinutes: 0, // 0 เมื่อเริ่มต้น
        usedSoftware: pc.software, // บันทึก Software ที่เครื่องนี้ติดตั้ง
        isAIUsed: pc.software.some(s => s.toLowerCase().includes('ai') || s.toLowerCase().includes('gpt') || s.toLowerCase().includes('gemini'))
    });

    // 4. แสดง Popup สำเร็จ
    alert(`✅ ลงชื่อเข้าใช้งานสำเร็จ!\n\nสวัสดีคุณ ${finalUser.name}\nระบบจะเริ่มจับเวลาการใช้งาน ณ บัดนี้`);

    // 5. ไปหน้าจับเวลา
    window.location.href = 'timer.html';
}