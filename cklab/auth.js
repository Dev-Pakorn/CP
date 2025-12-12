/* auth.js - Fixed Station Version (Updated for Booking Check-in) */

// ==========================================
// 🔧 SYSTEM CONFIG: ดึงเลขเครื่องจาก URL
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
    // เช็ค PC ID
    if (!FIXED_PC_ID || isNaN(parseInt(FIXED_PC_ID))) {
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center vh-100 flex-column text-center">
                <h2 class="text-danger">⚠️ ไม่พบหมายเลขเครื่อง (PC ID)</h2>
                <p class="text-muted">กรุณาระบุเลขเครื่องใน URL<br>ตัวอย่าง: <code>index.html?pc=1</code></p>
                <a href="index.html?pc=1" class="btn btn-primary mt-3">เข้าใช้งานเครื่องที่ 1</a>
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
        alert(`System Error: ไม่พบข้อมูลเครื่อง PC-${FIXED_PC_ID}`);
        return;
    }
    
    // Status Indicator
    const indicator = document.querySelector('.status-indicator');
    if(indicator) {
        indicator.className = 'status-indicator';
        indicator.classList.add(
            `bg-${pc.status === 'available' ? 'success' : 
                   pc.status === 'in_use' ? 'danger' : 
                   pc.status === 'reserved' ? 'warning' : 'secondary'}`
        );
        indicator.title = pc.status.toUpperCase();
    }

    // Auto Resume Session
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
        alert("❌ ไม่พบข้อมูลในระบบ");
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
    
    const pc = DB.getPCs().find(p => p.id == FIXED_PC_ID);
    
    // ✅ แก้ไข: อนุญาตให้ปุ่มทำงานได้ ถ้าเครื่องว่าง OR ถูกจองไว้ (reserved)
    const isAccessible = pc && (pc.status === 'available' || pc.status === 'reserved');

    if (isUserValid && isAccessible) {
        btn.disabled = false;
        btn.classList.replace('btn-secondary', 'btn-success');
        
        // เปลี่ยนข้อความปุ่มถ้าเป็นการจอง
        if (pc.status === 'reserved') {
            btn.innerHTML = `<i class="bi bi-calendar-check me-2"></i>ยืนยันการเข้าใช้งาน (จองไว้)`;
        } else {
            btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบและเริ่มใช้งาน`;
        }
    } else {
        btn.disabled = true;
        btn.classList.replace('btn-success', 'btn-secondary');
        if (!isAccessible) {
            btn.textContent = `❌ เครื่องไม่ว่าง (${pc.status})`;
        } else {
            btn.textContent = 'กรุณากรอกข้อมูลให้ครบ';
        }
    }
}

// ✅ ฟังก์ชันยืนยันการเข้าใช้งาน (Check-in)
function confirmCheckIn() {
    const pc = DB.getPCs().find(p => p.id == FIXED_PC_ID);
    
    // 1. เตรียมข้อมูลผู้ใช้
    let finalUser = null;
    const usageType = document.querySelector('input[name="usageType"]:checked').value;

    if (activeTab === 'internal') {
        finalUser = verifiedUserData;
    } else {
        finalUser = {
            id: document.getElementById('extIdCard').value.trim(),
            name: document.getElementById('extName').value.trim(),
            faculty: document.getElementById('extOrg').value.trim() || 'บุคคลทั่วไป',
            role: 'external',
            level: 'N/A',
            year: 'N/A'
        };
    }

    // 2. ตรวจสอบเงื่อนไขการจอง (Reserved Check)
    if (pc.status === 'reserved') {
        // เช็คว่าชื่อตรงกับที่จองไว้ไหม (เช็คแบบรวมๆ เผื่อพิมพ์ไม่ครบ)
        const bookedName = pc.currentUser || ''; // Admin ใส่ชื่อไว้ตอนจอง
        const currentName = finalUser.name || '';

        // ถ้าชื่อไม่คล้ายกันเลย ให้แจ้งเตือน (ป้องกันคนอื่นมาเนียนเข้า)
        // ใช้ .includes เพื่อเช็คว่า "สมชาย" อยู่ใน "นายสมชาย รักเรียน" หรือไม่
        if (!currentName.includes(bookedName) && !bookedName.includes(currentName)) {
            const confirmSteal = confirm(`⚠️ เครื่องนี้ถูกจองไว้สำหรับ: "${bookedName}"\nแต่ชื่อของคุณคือ: "${currentName}"\n\nคุณยืนยันที่จะเข้าใช้งานใช่หรือไม่?`);
            if (!confirmSteal) return;
        }
    } else if (pc.status !== 'available') {
        return alert(`❌ ไม่สามารถใช้งานได้ (สถานะ: ${pc.status})`);
    }

    // 3. เริ่ม Check-in (เปลี่ยนสถานะเป็น in_use)
    const startTime = Date.now();
    
    // บันทึกลง Database (เปลี่ยนจาก Reserved -> In Use)
    DB.updatePCStatus(FIXED_PC_ID, 'in_use', finalUser.name);
    
    // สร้าง Session
    DB.setSession({ 
        user: finalUser, 
        pcId: FIXED_PC_ID, 
        startTime: startTime, 
        usageType: usageType 
    });

    // บันทึก Log
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
        durationMinutes: 0, 
        usedSoftware: pc.installedSoftware || [], // ใช้ installedSoftware ให้ตรง
        isAIUsed: (pc.installedSoftware || []).some(s => s.toLowerCase().includes('ai') || s.toLowerCase().includes('gpt'))
    });

    // สำเร็จ!
    alert(`✅ Check-in สำเร็จ!\nยินดีต้อนรับคุณ ${finalUser.name}`);
    window.location.href = 'timer.html';
}