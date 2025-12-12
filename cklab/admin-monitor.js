/* admin-monitor.js (Updated: Auto Switch Booking Name) */

let checkInModal;
let currentTab = 'internal';
let verifiedUserData = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. เช็คสิทธิ์ Admin
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Init Modal
    const modalEl = document.getElementById('checkInModal');
    if (modalEl) {
        checkInModal = new bootstrap.Modal(modalEl);
    }

    // 3. เริ่มทำงาน
    renderMonitor();
    updateClock();
    
    // ✅ เรียกฟังก์ชันเช็คคิวทันที 1 รอบ
    checkAndSwitchBookingQueue();

    // Auto Refresh
    setInterval(() => {
        if (modalEl && !modalEl.classList.contains('show')) {
            renderMonitor();
        }
    }, 3000); // รีเฟรชหน้าจอทุก 3 วิ
    
    setInterval(updateClock, 1000); // นาฬิกาเดินทุก 1 วิ
    
    // ✅ เพิ่ม: เช็คคิวจองอัตโนมัติ ทุกๆ 1 นาที (60000 ms)
    setInterval(checkAndSwitchBookingQueue, 60000);
});

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('clockDisplay');
    if(clockEl) clockEl.innerText = now.toLocaleTimeString('th-TH');
}

// ==========================================
// 🔄 ฟังก์ชันใหม่: เช็คเวลาและเปลี่ยนชื่อคนจองอัตโนมัติ
// ==========================================
function checkAndSwitchBookingQueue() {
    const pcs = DB.getPCs();
    const bookings = DB.getBookings();
    const todayStr = new Date().toISOString().split('T')[0];
    
    // แปลงเวลาปัจจุบันเป็นนาที (เช่น 10:30 -> 630)
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let hasChanges = false;

    pcs.forEach(pc => {
        // เราจะเช็คเฉพาะเครื่องที่ "ว่าง (available)" หรือ "ถูกจอง (reserved)"
        // ถ้าเครื่อง "กำลังใช้งาน (in_use)" เราจะไม่ไปยุ่ง (ให้สิทธิ์คนนั่งอยู่ก่อน)
        if (pc.status !== 'available' && pc.status !== 'reserved') return;

        // หาการจองของ "เครื่องนี้" ใน "วันนี้" ที่อนุมัติแล้ว
        const myBookings = bookings.filter(b => 
            b.pcId === String(pc.id) && 
            b.date === todayStr && 
            b.status === 'approved'
        );

        if (myBookings.length === 0) {
            // ถ้าไม่มีการจองเลย แตสถานะค้างเป็น reserved -> ปลดล็อคเป็นว่าง
            if (pc.status === 'reserved') {
                DB.updatePCStatus(pc.id, 'available');
                hasChanges = true;
            }
            return;
        }

        // หาว่า "ตอนนี้" ตรงกับช่วงเวลาของใคร?
        const activeBooking = myBookings.find(b => {
            const [sh, sm] = b.startTime.split(':').map(Number);
            const [eh, em] = b.endTime.split(':').map(Number);
            const start = sh * 60 + sm;
            const end = eh * 60 + em;
            
            // เงื่อนไข: เวลาปัจจุบัน อยู่ระหว่าง เริ่ม และ จบ
            return currentMinutes >= start && currentMinutes < end;
        });

        if (activeBooking) {
            // ถ้าเจอเจ้าของคิวตัวจริงในเวลานี้
            // เช็คว่าชื่อบนหน้าจอตรงกันไหม? ถ้าไม่ตรง ให้เปลี่ยนเลย
            if (pc.currentUser !== activeBooking.userName || pc.status !== 'reserved') {
                console.log(`[Auto Switch] PC-${pc.id} เปลี่ยนผู้จองเป็น: ${activeBooking.userName}`);
                DB.updatePCStatus(pc.id, 'reserved', activeBooking.userName);
                hasChanges = true;
            }
        } else {
            // ถ้าตอนนี้ไม่มีใครจอง (เป็นช่วงว่างระหว่างคิว หรือจบวันแล้ว)
            // แต่สถานะยังเป็น reserved ค้างอยู่ -> ปลดล็อคเป็นว่าง
            if (pc.status === 'reserved') {
                console.log(`[Auto Switch] PC-${pc.id} หมดเวลาจอง -> คืนสถานะว่าง`);
                DB.updatePCStatus(pc.id, 'available');
                hasChanges = true;
            }
        }
    });

    // ถ้ามีการเปลี่ยนแปลง ให้รีเฟรชหน้าจอทันที
    if (hasChanges) {
        renderMonitor();
    }
}

// ==========================================
// ส่วน Render ปกติ (เหมือนเดิม)
// ==========================================

function renderMonitor() {
    const grid = document.getElementById('monitorGrid');
    if(!grid) return;

    const pcs = DB.getPCs();
    const bookings = DB.getBookings(); // ใช้ DB.getBookings() โดยตรง
    const todayStr = new Date().toISOString().split('T')[0]; 

    grid.innerHTML = '';

    pcs.forEach(pc => {
        let statusClass = '', iconClass = '', label = '', cardBorder = '';

        switch(pc.status) {
            case 'available': 
                statusClass = 'text-success'; cardBorder = 'border-success'; iconClass = 'bi-check-circle'; label = 'ว่าง (Available)'; break;
            case 'in_use': 
                statusClass = 'text-danger'; cardBorder = 'border-danger'; iconClass = 'bi-person-workspace'; label = 'ใช้งาน (In Use)'; break;
            case 'reserved': 
                statusClass = 'text-warning'; cardBorder = 'border-warning'; iconClass = 'bi-bookmark-fill'; label = 'จอง (Reserved)'; break;
            default: 
                statusClass = 'text-secondary'; cardBorder = 'border-secondary'; iconClass = 'bi-wrench-adjustable'; label = 'ชำรุด (Maintenance)';
        }

        const userDisplay = pc.currentUser ? 
            `<div class="mt-2 small text-dark fw-bold text-truncate"><i class="bi bi-person-fill"></i> ${pc.currentUser}</div>` : 
            `<div class="mt-2 small text-muted">-</div>`;

        // หาข้อมูลการจองมาโชว์ (เพื่อความสวยงาม)
        let activeBooking = bookings.find(b => 
            b.pcId == pc.id && b.date === todayStr && b.status === 'approved' &&
            (pc.currentUser ? b.userName === pc.currentUser : false)
        );

        let timeSlotInfo = '';
        if (activeBooking) {
            timeSlotInfo = `<div class="d-flex align-items-center justify-content-center text-primary mt-1" style="font-size: 0.75rem;">
                <i class="bi bi-calendar-check me-1"></i> จอง: ${activeBooking.startTime} - ${activeBooking.endTime}
            </div>`;
        } else if (pc.status === 'in_use') {
             timeSlotInfo = `<div class="text-muted mt-1" style="font-size: 0.75rem;">(Walk-in)</div>`;
        } else {
             timeSlotInfo = `<div class="text-muted mt-1" style="font-size: 0.75rem; visibility: hidden;">-</div>`;
        }

        // Usage Time Badge
        let usageTimeBadge = '';
        if (pc.status === 'in_use' && pc.startTime) {
            const diffMs = Date.now() - pc.startTime;
            const diffMins = Math.floor(diffMs / 60000);
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            const timeTxt = hrs > 0 ? `${hrs}ชม. ${mins}น.` : `${mins} นาที`;
            const badgeColor = hrs >= 3 ? 'bg-danger' : 'bg-warning text-dark';
            usageTimeBadge = `<div class="badge ${badgeColor} mt-1 border"><i class="bi bi-stopwatch-fill"></i> ใช้ไป ${timeTxt}</div>`;
        } else {
            usageTimeBadge = `<div class="mt-1" style="height: 21px;"></div>`; 
        }

        // Software Badges
        let softwareHtml = '';
        if (Array.isArray(pc.installedSoftware) && pc.installedSoftware.length > 0) {
            softwareHtml = '<div class="mt-2 pt-2 border-top d-flex flex-wrap justify-content-center gap-1">';
            const showCount = 2; 
            pc.installedSoftware.slice(0, showCount).forEach(sw => {
                softwareHtml += `<span class="badge bg-light text-secondary border" style="font-size: 0.65rem;">${sw}</span>`;
            });
            if (pc.installedSoftware.length > showCount) {
                softwareHtml += `<span class="badge bg-light text-secondary border" style="font-size: 0.65rem;">+${pc.installedSoftware.length - showCount}</span>`;
            }
            softwareHtml += '</div>';
        } else {
             softwareHtml = '<div class="mt-2 pt-2 border-top" style="height: 29px;"></div>';
        }

        grid.innerHTML += `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="card h-100 shadow-sm ${cardBorder}" style="cursor: pointer; transition: transform 0.2s;" 
                     onclick="handlePcClick('${pc.id}')" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                    <div class="card-body text-center p-3">
                        <div class="d-flex justify-content-between align-items-start position-absolute top-0 end-0 p-2">
                             ${pc.installedSoftware && pc.installedSoftware.includes('GPU') ? '<i class="bi bi-gpu-card text-primary" title="High Perf"></i>' : ''}
                        </div>
                        <i class="bi ${iconClass} display-6 ${statusClass} mb-2"></i>
                        <h5 class="fw-bold mb-0 text-dark">${pc.name}</h5>
                        <div class="badge bg-light text-dark border mb-1">${label}</div>
                        ${userDisplay}
                        ${timeSlotInfo}
                        ${usageTimeBadge}
                        ${softwareHtml} 
                    </div>
                </div>
            </div>
        `;
    });
}

function handlePcClick(pcId) {
    const pc = DB.getPCs().find(p => String(p.id) === String(pcId));
    if (!pc) return;

    if (pc.status === 'available') {
        openCheckInModal(pc);
    } else if (pc.status === 'in_use') {
        if(confirm(`⚠️ เครื่อง ${pc.name} กำลังใช้งานโดย ${pc.currentUser}\nต้องการบังคับออกจากระบบ (Force Logout) หรือไม่?`)) {
            performForceCheckout(pc.id);
        }
    } else {
        alert(`เครื่องนี้สถานะ ${pc.status} ไม่สามารถดำเนินการได้ในขณะนี้`);
    }
}

function openCheckInModal(pc) {
    document.getElementById('checkInPcId').value = pc.id;
    document.getElementById('modalPcName').innerText = `Station: ${pc.name}`;
    const swContainer = document.getElementById('modalSoftwareTags');
    swContainer.innerHTML = '';
    if (pc.installedSoftware && Array.isArray(pc.installedSoftware) && pc.installedSoftware.length > 0) {
        pc.installedSoftware.forEach(sw => {
            swContainer.innerHTML += `<span class="badge bg-info text-dark me-1 border border-info bg-opacity-25">${sw}</span>`;
        });
    } else {
        swContainer.innerHTML = '<span class="text-muted small">- ไม่มีข้อมูล Software -</span>';
    }
    switchTab('internal');
    document.getElementById('ubuUser').value = '';
    document.getElementById('extIdCard').value = '';
    document.getElementById('extName').value = '';
    document.getElementById('extOrg').value = '';
    document.getElementById('internalVerifyCard').classList.add('d-none');
    const btnConfirm = document.getElementById('btnConfirm');
    btnConfirm.disabled = true;
    btnConfirm.className = 'btn btn-secondary w-100 py-3 fw-bold shadow-sm';
    btnConfirm.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>ยืนยัน Check-in';
    verifiedUserData = null;
    if(checkInModal) checkInModal.show();
}

function switchTab(tabName) {
    currentTab = tabName;
    const btnInternal = document.getElementById('tab-internal');
    const btnExternal = document.getElementById('tab-external');
    const formInternal = document.getElementById('formInternal');
    const formExternal = document.getElementById('formExternal');
    const btnConfirm = document.getElementById('btnConfirm');

    if (tabName === 'internal') {
        btnInternal.classList.add('active', 'bg-primary', 'text-white');
        btnInternal.classList.remove('border');
        btnExternal.classList.remove('active', 'bg-primary', 'text-white');
        btnExternal.classList.add('border');
        formInternal.classList.remove('d-none');
        formExternal.classList.add('d-none');
        btnConfirm.disabled = !verifiedUserData;
        btnConfirm.className = verifiedUserData ? 'btn btn-success w-100 py-3 fw-bold shadow-sm' : 'btn btn-secondary w-100 py-3 fw-bold shadow-sm';
    } else {
        btnExternal.classList.add('active', 'bg-primary', 'text-white');
        btnExternal.classList.remove('border');
        btnInternal.classList.remove('active', 'bg-primary', 'text-white');
        btnInternal.classList.add('border');
        formExternal.classList.remove('d-none');
        formInternal.classList.add('d-none');
        btnConfirm.disabled = false;
        btnConfirm.className = 'btn btn-success w-100 py-3 fw-bold shadow-sm';
    }
}

function verifyUBUUser() {
    const userIdInput = document.getElementById('ubuUser');
    const userId = userIdInput.value.trim();
    if (!userId) { alert('กรุณากรอกรหัสนักศึกษา / บุคลากร'); userIdInput.focus(); return; }
    const user = DB.checkRegAPI(userId);
    if (user) {
        verifiedUserData = {
            id: userId,
            name: user.prefix + user.name,
            faculty: user.faculty,
            role: user.role
        };
        document.getElementById('internalVerifyCard').classList.remove('d-none');
        document.getElementById('showName').innerText = verifiedUserData.name;
        document.getElementById('showFaculty').innerText = verifiedUserData.faculty;
        const btnConfirm = document.getElementById('btnConfirm');
        btnConfirm.disabled = false;
        btnConfirm.className = 'btn btn-success w-100 py-3 fw-bold shadow-sm';
    } else {
        alert('❌ ไม่พบข้อมูลในระบบ (ลองใช้รหัส: 66123456)');
        verifiedUserData = null;
        document.getElementById('internalVerifyCard').classList.add('d-none');
        const btnConfirm = document.getElementById('btnConfirm');
        btnConfirm.disabled = true;
        btnConfirm.className = 'btn btn-secondary w-100 py-3 fw-bold shadow-sm';
    }
}

function confirmCheckIn() {
    const pcId = document.getElementById('checkInPcId').value;
    let finalName = "", userType = "", finalId = "";
    if (currentTab === 'internal') {
        if (!verifiedUserData) return;
        finalName = verifiedUserData.name; userType = verifiedUserData.role; finalId = verifiedUserData.id;
    } else {
        const extName = document.getElementById('extName').value.trim();
        const extOrg = document.getElementById('extOrg').value.trim();
        const extId = document.getElementById('extIdCard').value.trim();
        if (!extName) { alert('กรุณากรอกชื่อ-นามสกุล'); document.getElementById('extName').focus(); return; }
        finalName = extName + (extOrg ? ` (${extOrg})` : ''); userType = 'Guest'; finalId = extId || 'N/A';
    }
    DB.updatePCStatus(pcId, 'in_use', finalName);
    DB.saveLog({
        action: 'Admin Check-in',
        userId: finalId, userName: finalName, userRole: userType, pcId: pcId,
        details: 'Manual check-in by Admin'
    });
    if(checkInModal) checkInModal.hide();
    renderMonitor();
}

function performForceCheckout(pcId) {
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));
    const currentUser = pc ? pc.currentUser : 'Unknown';
    DB.updatePCStatus(pcId, 'available');
    DB.saveLog({
        action: 'Force Check-out',
        pcId: pcId, user: currentUser, userRole: 'System Admin',
        details: 'Forced logout via Monitor (Auto Rating 5/5)',
        satisfactionScore: 5
    });
    renderMonitor();
}