/* admin-monitor.js */

let actionModal; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. เช็คสิทธิ์ Admin
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Init Modal
    actionModal = new bootstrap.Modal(document.getElementById('actionModal'));

    // 3. เริ่ม Render
    renderMonitor();
    updateClock();
    
    // Auto Refresh ทุก 3 วินาที
    setInterval(renderMonitor, 3000);
    setInterval(updateClock, 1000);
});

function updateClock() {
    const now = new Date();
    document.getElementById('clockDisplay').innerText = now.toLocaleTimeString('th-TH');
}

// --- RENDER GRID ---
function renderMonitor() {
    // ถ้า Modal เปิดอยู่ ไม่ต้อง Rerender (เดี๋ยวฟอร์มเด้งหาย)
    if (document.getElementById('actionModal').classList.contains('show')) return;

    const grid = document.getElementById('monitorGrid');
    const pcs = DB.getPCs();

    grid.innerHTML = '';

    pcs.forEach(pc => {
        let statusClass = '';
        let iconClass = '';
        let label = '';

        // Map status to CSS classes
        switch(pc.status) {
            case 'available': 
                statusClass = 'status-available'; 
                iconClass = 'bi-check-circle available'; 
                label = 'ว่าง (Available)';
                break;
            case 'in_use': 
                statusClass = 'status-in_use'; 
                iconClass = 'bi-person-workspace in_use'; 
                label = 'ใช้งาน (In Use)';
                break;
            case 'reserved': 
                statusClass = 'status-reserved'; 
                iconClass = 'bi-bookmark-fill reserved'; 
                label = 'จอง (Reserved)';
                break;
            default: 
                statusClass = 'status-maintenance'; 
                iconClass = 'bi-wrench-adjustable maintenance'; 
                label = 'ชำรุด (Maintenance)';
        }

        const userDisplay = pc.currentUser ? 
            `<div class="mt-2 small text-primary fw-bold text-truncate"><i class="bi bi-person-fill"></i> ${pc.currentUser}</div>` : 
            `<div class="mt-2 small text-muted">-</div>`;

        // สร้าง HTML Card
        grid.innerHTML += `
            <div class="col-6 col-md-4 col-lg-3">
                <div class="pc-card ${statusClass}" onclick="openActionModal('${pc.id}')">
                    <div class="pc-card-body">
                        <i class="bi ${iconClass} pc-icon"></i>
                        <h5 class="fw-bold mb-1">PC-${pc.id.toString().padStart(2,'0')}</h5>
                        <div class="badge bg-light text-dark border mb-1">${label}</div>
                        ${userDisplay}
                    </div>
                </div>
            </div>
        `;
    });
}

// --- OPEN MODAL (จัดการคลิก) ---
function openActionModal(pcId) {
    const pc = DB.getPCs().find(p => p.id == pcId);
    if (!pc) return;

    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = `จัดการเครื่อง PC-${pcId.padStart(2,'0')}`;

    // CASE A: เครื่องว่าง -> Admin Check-in
    if (pc.status === 'available') {
        modalBody.innerHTML = `
            <div class="text-center mb-4">
                <div class="modal-icon-header text-success"><i class="bi bi-check-circle"></i></div>
                <h5 class="fw-bold">เครื่องว่าง (Available)</h5>
                <p class="text-muted small">คุณสามารถลงชื่อเข้าใช้แทนผู้ใช้ได้ (Admin Check-in)</p>
            </div>
            
            <form onsubmit="event.preventDefault(); performAdminCheckIn('${pc.id}');">
                <div class="mb-3">
                    <label class="form-label small fw-bold">รหัสนักศึกษา / UBU WiFi</label>
                    <input type="text" id="adminCheckInUser" class="form-control" placeholder="เช่น 66123456" required>
                </div>
                <button type="submit" class="btn btn-primary w-100">
                    ยืนยัน (Check-in)
                </button>
            </form>
        `;
    } 
    // CASE B: เครื่องไม่ว่าง -> Force Check-out
    else if (pc.status === 'in_use') {
        // คำนวณเวลา
        const duration = pc.startTime ? Math.floor((Date.now() - pc.startTime)/60000) : 0;

        modalBody.innerHTML = `
            <div class="text-center mb-4">
                <div class="modal-icon-header text-danger"><i class="bi bi-person-workspace"></i></div>
                <h5 class="fw-bold">กำลังใช้งาน (In Use)</h5>
                <p class="text-muted small">ต้องการบังคับออกจากระบบหรือไม่?</p>
            </div>
            
            <div class="card bg-light border p-3 mb-3">
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">ผู้ใช้งาน:</span>
                    <strong class="text-dark">${pc.currentUser || 'Unknown'}</strong>
                </div>
                <div class="d-flex justify-content-between">
                    <span class="text-muted">ระยะเวลา:</span>
                    <strong class="text-primary">${duration} นาที</strong>
                </div>
            </div>

            <button onclick="performForceCheckout('${pc.id}')" class="btn btn-danger w-100">
                <i class="bi bi-power me-2"></i>Force Check-out (บังคับออก)
            </button>
        `;
    }
    // CASE C: อื่นๆ
    else {
        modalBody.innerHTML = `
            <div class="text-center py-3">
                <h5>สถานะ: ${pc.status}</h5>
                <button onclick="performReset('${pc.id}')" class="btn btn-sm btn-outline-secondary mt-2">Reset to Available</button>
            </div>
        `;
    }

    actionModal.show();
}

// --- ACTIONS ---

// 1. Admin Check-in (เฉพาะผู้ใช้ภายใน)
function performAdminCheckIn(pcId) {
    const userId = document.getElementById('adminCheckInUser').value.trim();
    if (!userId) return;

    // ตรวจสอบกับ Mock API (เหมือนฝั่ง User)
    const user = DB.checkRegAPI(userId);

    if (user) {
        const userName = user.prefix + user.name;
        
        // อัปเดตสถานะ
        DB.updatePCStatus(pcId, 'in_use', userName);
        
        // Log
        DB.saveLog({
            action: 'Admin Check-in',
            user: userName,
            pcId: pcId,
            details: 'Force by Admin'
        });

        alert(`✅ ลงชื่อเข้าใช้สำเร็จ: ${userName}`);
        actionModal.hide();
        renderMonitor();
    } else {
        alert("❌ ไม่พบข้อมูลผู้ใช้ในระบบ (Hint: 66123456)");
    }
}

// 2. Force Check-out
function performForceCheckout(pcId) {
    if(confirm('ยืนยันที่จะบังคับผู้ใช้นี้ออกจากระบบ?')) {
        
        // คืนสถานะว่าง
        DB.updatePCStatus(pcId, 'available');
        
        // Log
        DB.saveLog({
            action: 'Force Check-out',
            pcId: pcId,
            user: 'Admin Action'
        });

        alert("✅ บังคับออกจากระบบเรียบร้อย");
        actionModal.hide();
        renderMonitor();
    }
}

// 3. Reset (เผื่อกรณีค้าง)
function performReset(pcId) {
    if(confirm('Reset สถานะเป็นเครื่องว่าง?')) {
        DB.updatePCStatus(pcId, 'available');
        actionModal.hide();
        renderMonitor();
    }
}