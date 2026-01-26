/* auth.js - Kiosk Logic (Final: Unlimited + Fix Year/Level Data + UI Sync + Code Name) */

function getSystemPCId() {
    if (window.location.hash) {
        let id = window.location.hash.replace('#', '').replace(/pc-/i, '');
        return parseInt(id).toString();
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('pc');
}

const FIXED_PC_ID = getSystemPCId(); 

let verifiedUserData = null;
let activeTab = 'internal';
let lastLabStatus = null; 
let lastAdminMessage = null;
let labClosedModal = null; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check DB
    if (typeof DB === 'undefined') {
        document.body.innerHTML = '<div class="alert alert-danger m-5 text-center"><h3>❌ Error</h3><p>ไม่พบฐานข้อมูล (DB is not defined)</p></div>';
        return;
    }

    // 2. Setup Modal
    const modalEl = document.getElementById('labClosedModal');
    if (modalEl) labClosedModal = new bootstrap.Modal(modalEl);

    // 3. Monitor Status
    monitorLabStatus();
    setInterval(monitorLabStatus, 2000);

    const config = DB.getGeneralConfig();
    if (config && config.labStatus === 'closed') return; 

    // 4. Validate PC ID
    if (!FIXED_PC_ID || isNaN(parseInt(FIXED_PC_ID))) {
        renderNoPcIdError();
        return;
    }

    checkMachineStatus();
    
    // Bind Events
    const extInputs = document.querySelectorAll('#formExternal input');
    if(extInputs.length > 0) extInputs.forEach(input => input.addEventListener('input', validateForm));
    
    // Smart Enter Logic
    const ubuInput = document.getElementById('ubuUser');
    if(ubuInput) {
        ubuInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {
                if (!verifiedUserData) {
                    verifyUBUUser(); // ยังไม่ผ่าน -> ตรวจสอบ
                } else {
                    confirmCheckIn(); // ผ่านแล้ว -> เข้าใช้งานเลย
                }
            } 
        });
    }
});

// ✅ Monitor Lab Status (Sync with Admin Config)
function monitorLabStatus() {
    const config = DB.getGeneralConfig();
    if (!config) return;

    const currentStatus = config.labStatus || 'open';
    const currentMessage = config.adminMessage || 'ขออภัยในความไม่สะดวก';

    // Update UI
    if(document.getElementById('displayLabName')) document.getElementById('displayLabName').innerText = config.labName;
    if(document.getElementById('displayLocation')) document.getElementById('displayLocation').innerText = config.labLocation;

    // Update Contact Info
    const contactSection = document.getElementById('contactInfoSection');
    if (contactSection) {
        if (config.adminOnDuty || config.contactPhone) {
            contactSection.classList.remove('d-none');
            const adminNameEl = document.getElementById('displayAdminOnDuty');
            if(adminNameEl) adminNameEl.innerText = config.adminOnDuty || 'เจ้าหน้าที่ประจำห้อง';
            const phoneEl = document.getElementById('displayContactPhone');
            if(phoneEl) phoneEl.innerText = config.contactPhone || '-';
        } else {
            contactSection.classList.add('d-none');
        }
    }

    // Handle Closed Status
    if (currentStatus === 'closed') {
        const msgEl = document.getElementById('modalClosedMessage');
        if (msgEl) msgEl.innerText = currentMessage;

        if (labClosedModal) {
            const el = document.getElementById('labClosedModal');
            if (!el.classList.contains('show')) labClosedModal.show();
        }
    } else if (currentStatus === 'open') {
        if (lastLabStatus === 'closed') {
            if (labClosedModal) labClosedModal.hide();
            window.location.reload(); 
        }
    }

    lastLabStatus = currentStatus;
    lastAdminMessage = currentMessage;
}

function renderNoPcIdError() {
    document.body.innerHTML = `
        <div class="d-flex justify-content-center align-items-center vh-100 flex-column text-center bg-light">
            <div class="card border-0 shadow p-5 rounded-4">
                <h2 class="fw-bold text-dark">⚠️ Setup Error</h2>
                <p class="text-muted mb-4">ไม่พบหมายเลขเครื่องใน URL<br>กรุณาเข้าผ่านลิงก์เช่น: <code>index.html?pc=1</code></p>
                <a href="index.html?pc=1" class="btn btn-primary px-4 py-2 fw-bold rounded-pill">จำลองเข้าเครื่องที่ 1</a>
            </div>
        </div>
    `;
}

function checkMachineStatus() {
    // 1. ดึงข้อมูล PC ก่อนเพื่อเช็ค Code Name
    const pc = DB.getPCs().find(p => String(p.id) === String(FIXED_PC_ID));

    // 2. อัปเดตการแสดงผลชื่อเครื่อง (เพิ่ม Code Name logic)
    const displayId = document.getElementById('fixedPcIdDisplay');
    if(displayId) {
        let idText = `PC-${FIXED_PC_ID.toString().padStart(2, '0')}`;
        
        if (pc && pc.codeName) {
            // ✅ แสดง Code Name เช่น: PC-01 | Alpha
            displayId.innerHTML = `${idText} <span class="text-muted fw-normal mx-1">|</span> ${pc.codeName}`;
        } else {
            displayId.innerText = idText;
        }
        displayId.className = 'fw-bold text-primary';
    }

    if (!pc) return; 
    
    // Status Indicator
    const indicator = document.querySelector('.status-indicator');
    if(indicator) {
        indicator.className = 'status-indicator rounded-circle d-inline-block';
        indicator.style.width = '10px';
        indicator.style.height = '10px';
        indicator.style.marginRight = '6px';
        
        if(pc.status === 'available') indicator.classList.add('bg-success');
        else if(pc.status === 'in_use') indicator.classList.add('bg-danger');
        else if(pc.status === 'reserved') indicator.classList.add('bg-warning');
        else indicator.classList.add('bg-secondary');
    }
    
    // Show Software Tags on Kiosk Screen
    const swTagContainer = document.getElementById('modalSoftwareTags'); 
    if (swTagContainer) {
         swTagContainer.innerHTML = '';
         if (pc.installedSoftware && pc.installedSoftware.length > 0) {
             // Show top 3 only
             pc.installedSoftware.slice(0, 3).forEach(sw => {
                 swTagContainer.innerHTML += `<span class="badge bg-light text-secondary border me-1">${sw.split('(')[0]}</span>`;
             });
             if(pc.installedSoftware.length > 3) swTagContainer.innerHTML += `<span class="badge bg-light text-secondary border">+${pc.installedSoftware.length - 3}</span>`;
         } else {
             swTagContainer.innerHTML = '<span class="text-muted small">-</span>';
         }
    }

    // Auto Resume Session (if user refreshed or came back)
    if (pc.status === 'in_use' && lastLabStatus === 'open') {
         const currentSession = DB.getSession();
         if (!currentSession || String(currentSession.pcId) !== String(FIXED_PC_ID)) {
              // Recover session from PC state if local storage is missing
              DB.setSession({
                   pcId: FIXED_PC_ID,
                   user: { name: pc.currentUser || 'Unknown User' },
                   startTime: pc.startTime || Date.now(),
                   forceEndTime: pc.forceEndTime || null 
              });
         }
         window.location.href = 'timer.html';
    } 
}

function switchTab(type) {
    activeTab = type;
    verifiedUserData = null;
    const btnInt = document.getElementById('tab-internal');
    const btnExt = document.getElementById('tab-external');
    
    // Reset Internal Form
    document.getElementById('ubuUser').value = '';
    document.getElementById('internalVerifyCard').classList.add('d-none');
    const errEl = document.getElementById('loginError');
    if(errEl) errEl.classList.add('d-none');

    if(type === 'internal') {
        if(btnInt) btnInt.classList.add('active'); 
        if(btnExt) btnExt.classList.remove('active');
        document.getElementById('formInternal').classList.remove('d-none');
        document.getElementById('formExternal').classList.add('d-none');
    } else {
        if(btnExt) btnExt.classList.add('active'); 
        if(btnInt) btnInt.classList.remove('active');
        document.getElementById('formExternal').classList.remove('d-none');
        document.getElementById('formInternal').classList.add('d-none');
    }
    validateForm();
}

function verifyUBUUser() {
    const input = document.getElementById('ubuUser');
    const id = input.value.trim();
    if(!id) { input.focus(); return; }
    
    const user = DB.checkRegAPI(id);
    const verifyCard = document.getElementById('internalVerifyCard');
    const errEl = document.getElementById('loginError');
    
    if (user) {
        // ✅ เก็บข้อมูล Level และ Year เพิ่มเติม
        verifiedUserData = { 
            id: id, 
            name: user.prefix + user.name, 
            faculty: user.faculty, 
            role: user.role,
            level: user.level, // เก็บระดับการศึกษา
            year: user.year    // เก็บชั้นปี
        };
        document.getElementById('showName').innerText = verifiedUserData.name;
        document.getElementById('showFaculty').innerText = verifiedUserData.faculty;
        const roleEl = document.getElementById('showRole');
        if(roleEl) roleEl.innerText = verifiedUserData.role.toUpperCase();
        
        verifyCard.classList.remove('d-none');
        if(errEl) errEl.classList.add('d-none'); // ซ่อน Error

        validateForm();
    } else {
        // ใช้ Inline Error แทน Alert เพื่อความสวยงาม
        if(errEl) {
            errEl.classList.remove('d-none');
            input.classList.add('is-invalid');
            setTimeout(() => input.classList.remove('is-invalid'), 2000);
        } else {
            alert("❌ ไม่พบข้อมูลในระบบ");
        }
        
        verifyCard.classList.add('d-none');
        verifiedUserData = null;
        input.value = ''; input.focus(); validateForm();
    }
}

function validateForm() {
    let isUserValid = false;
    const btn = document.getElementById('btnConfirm');
    if (!btn) return;

    if (activeTab === 'internal') isUserValid = (verifiedUserData !== null);
    else {
        const id = document.getElementById('extIdCard').value.trim();
        const name = document.getElementById('extName').value.trim();
        isUserValid = (id !== '' && name !== '');
    }
    
    const pc = DB.getPCs().find(p => String(p.id) === String(FIXED_PC_ID));
    // Allow check-in if Available OR Reserved (for booking user)
    const isAccessible = pc && (pc.status === 'available' || pc.status === 'reserved');
    
    if (isUserValid && isAccessible) {
        btn.disabled = false;
        btn.className = 'btn btn-success w-100 py-3 fw-bold shadow-sm rounded-3 transition-btn';
        if (pc.status === 'reserved') btn.innerHTML = `<i class="bi bi-calendar-check me-2"></i>ยืนยันการเข้าใช้งาน (ตามที่จองไว้)`;
        else btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบและเริ่มใช้งาน`;
    } else {
        btn.disabled = true;
        btn.className = 'btn btn-secondary w-100 py-3 fw-bold shadow-sm rounded-3 transition-btn';
        if (!isAccessible) btn.innerHTML = `<i class="bi bi-x-circle me-2"></i>เครื่องไม่ว่าง (${pc ? pc.status : 'Error'})`;
        else btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>เข้าสู่ระบบและเริ่มใช้งาน`;
    }
}

// ✅✅✅ MAIN CONFIRM FUNCTION (Updated: Unlimited + Log Data) ✅✅✅
function confirmCheckIn() {
    const config = DB.getGeneralConfig();
    if (config.labStatus === 'closed') {
        alert("⛔ ระบบปิดให้บริการแล้ว");
        monitorLabStatus(); 
        return; 
    }

    if (!verifiedUserData && activeTab === 'internal') return;
    
    if (activeTab === 'external') {
        verifiedUserData = {
            id: document.getElementById('extIdCard').value.trim(),
            name: document.getElementById('extName').value.trim(),
            faculty: document.getElementById('extOrg').value.trim() || 'บุคคลทั่วไป',
            role: 'external',
            // ✅ เพิ่ม Default Data สำหรับบุคคลภายนอก
            level: 'บุคคลทั่วไป',
            year: '-'
        };
    }
    
    const pcId = FIXED_PC_ID; 
    const pcInfo = DB.getPCs().find(p => String(p.id) === String(pcId));
    
    // --- 1. ตรวจสอบการจอง (Booking Check) ---
    const bookings = DB.getBookings(); 
    const todayStr = new Date().toLocaleDateString('en-CA');
    const validBooking = bookings.find(b => 
        String(b.pcId) === String(pcId) && 
        b.date === todayStr && 
        b.status === 'approved' && 
        b.userName === verifiedUserData.name 
    );
    
    let usageDetail = 'Walk-in User';
    
    const now = new Date();
    const currentHm = now.getHours() * 60 + now.getMinutes();

    if (validBooking) {
        const [startH, startM] = validBooking.startTime.split(':').map(Number);
        const bookingStartMins = startH * 60 + startM;
        
        // มาก่อนเวลาเกิน 15 นาที?
        if (currentHm < (bookingStartMins - 15)) {
             if(!confirm(`⚠️ คุณมาก่อนเวลาจองเกิน 15 นาที\nกด OK เพื่อเข้าใช้งานแบบ Walk-in ก่อน (อาจต้องออกเมื่อถึงเวลาจอง)\nกด Cancel เพื่อรอเวลา`)) return;
        } else {
             usageDetail = 'Check-in from Booking';
             DB.updateBookingStatus(validBooking.id, 'completed'); // Mark as Completed
        }
    } else if (pcInfo.status === 'reserved') {
        alert(`⛔ เครื่องนี้ถูกจองไว้โดยผู้อื่น กรุณาใช้เครื่องอื่น`);
        return;
    }

    // --- 2. ตั้งค่าเวลา (Unlimited) ---
    const forceEndTime = null; 
    const currentSlotId = 'Unlimited'; 
    
    // --- 3. บันทึก Session ---
    const sessionData = {
        user: { 
            id: verifiedUserData.id, 
            name: verifiedUserData.name, 
            role: verifiedUserData.role, 
            faculty: verifiedUserData.faculty,
            // ✅ เพิ่มข้อมูลลง Session
            level: verifiedUserData.level,
            year: verifiedUserData.year
        },
        pcId: pcId, 
        startTime: Date.now(), 
        forceEndTime: forceEndTime, 
        slotId: currentSlotId
    };
    
    DB.setSession(sessionData); 
    
    // อัปเดตสถานะเครื่องใน DB
    DB.updatePCStatus(pcId, 'in_use', verifiedUserData.name, { forceEndTime: forceEndTime }); 
    
    // บันทึก Log (Log เริ่มต้น) - เพิ่ม level และ year ลงไป
    DB.saveLog({
        action: 'START_SESSION',
        userId: verifiedUserData.id, 
        userName: verifiedUserData.name, 
        userRole: verifiedUserData.role, 
        userFaculty: verifiedUserData.faculty,
        // ✅ เพิ่มข้อมูลลง Log
        userLevel: verifiedUserData.level,
        userYear: verifiedUserData.year,
        
        pcId: pcId, 
        startTime: new Date().toISOString(), 
        details: usageDetail,
        slotId: currentSlotId 
    });

    // ไปหน้าจับเวลา
    window.location.href = 'timer.html';
}