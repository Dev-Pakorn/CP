/* admin-manage.js (Final Fix: Ensure rendering and error handling) */

let pcModal; // ตัวแปรเก็บ Modal

document.addEventListener('DOMContentLoaded', () => {
    // 1. ตรวจสอบ DB และ Session
    if (typeof DB === 'undefined') {
        console.error("Critical: mock-db.js not loaded. Cannot manage PC data.");
        alert("Error: ไม่พบไฟล์ mock-db.js กรุณาตรวจสอบการเชื่อมต่อ");
        return;
    }

    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        // window.location.href = 'admin-login.html'; // เปิดใช้งานเมื่อต้องการบังคับ Login
    }

    // 2. เตรียม Modal
    const modalEl = document.getElementById('pcModal');
    if (modalEl) {
        pcModal = new bootstrap.Modal(modalEl);
    }

    // 3. ✅ วาดตารางข้อมูลทันที (เรียกฟังก์ชันหลัก)
    renderPCTable();
});

// --- 1. RENDER TABLE (แสดงตารางรายชื่อ PC) ---
function renderPCTable() {
    const tbody = document.getElementById('pcTableBody');
    if (!tbody) return;

    // ดึงข้อมูล (ถ้า DB.getPCs() มีปัญหาหรือไม่คืนค่า Array ให้ใช้ Array ว่าง)
    const pcs = Array.isArray(DB.getPCs()) ? DB.getPCs() : [];
    
    tbody.innerHTML = '';

    if (pcs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">ไม่พบข้อมูลเครื่องคอมพิวเตอร์ (กดปุ่ม "เพิ่มเครื่องใหม่")</td></tr>`;
        return;
    }

    pcs.forEach(pc => {
        // Fallback for missing data
        const id = pc.id || '?';
        const name = pc.name || 'Unknown';
        const status = pc.status || 'maintenance';
        
        // จัดการสี Badge สถานะ
        let badgeClass = 'bg-secondary';
        if (status === 'available') badgeClass = 'bg-success';
        if (status === 'in_use') badgeClass = 'bg-danger';
        if (status === 'reserved') badgeClass = 'bg-warning text-dark';
        
        // จัดการรายชื่อ Software
        let softBadges = '<span class="text-muted small">-</span>';
        if (Array.isArray(pc.software) && pc.software.length > 0) {
            softBadges = pc.software.map(s => {
                let sName = s || "";
                let isAI = sName.toLowerCase().includes('gpt') || sName.toLowerCase().includes('ai') || sName.toLowerCase().includes('gemini');
                let color = isAI ? 'bg-primary bg-opacity-10 text-primary border border-primary' : 'bg-light text-dark border';
                return `<span class="badge ${color} me-1 mb-1 fw-normal">${sName}</span>`;
            }).join('');
        }

        // เพิ่มแถวในตาราง
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-muted">#${id}</td>
                <td><span class="fw-bold text-primary">${name}</span></td>
                <td><span class="badge ${badgeClass}">${status.toUpperCase()}</span></td>
                <td>${softBadges}</td>
                <td class="text-end pe-4">
                    <button onclick="openPCModal('${id}')" class="btn btn-sm btn-outline-primary me-1"><i class="bi bi-pencil-fill"></i></button>
                    <button onclick="deletePC('${id}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash-fill"></i></button>
                </td>
            </tr>
        `;
    });
}

// --- 2. OPEN MODAL (เปิดหน้าต่างเพิ่ม/แก้ไข) ---
function openPCModal(id = null) {
    if (!pcModal) {
        alert("Error: Modal ไม่พร้อมใช้งาน (เช็ค Console F12)");
        return;
    }

    const modalTitle = document.getElementById('pcModalTitle');
    
    // เคลียร์ค่าเดิมในฟอร์ม
    document.getElementById('editPcId').value = '';
    document.getElementById('editPcName').value = '';
    document.getElementById('editPcStatus').value = 'available';

    // โหลดรายชื่อ Software มาสร้าง Checkbox รอไว้
    renderSoftwareCheckboxes(id);

    if (id) {
        // กรณีแก้ไข
        modalTitle.innerText = `แก้ไข PC-${id.toString().padStart(2,'0')}`;
        const pcs = Array.isArray(DB.getPCs()) ? DB.getPCs() : [];
        const pc = pcs.find(p => p.id == id);
        if (pc) {
            document.getElementById('editPcId').value = pc.id;
            document.getElementById('editPcName').value = pc.name;
            document.getElementById('editPcStatus').value = pc.status;
        }
    } else {
        // กรณีเพิ่มใหม่
        modalTitle.innerText = 'เพิ่มเครื่องใหม่';
        const pcs = Array.isArray(DB.getPCs()) ? DB.getPCs() : [];
        // Gen เลขเครื่องถัดไปอัตโนมัติ
        let maxId = 0;
        pcs.forEach(p => { let num = parseInt(p.id); if (!isNaN(num) && num > maxId) maxId = num; });
        document.getElementById('editPcName').value = `PC-${(maxId + 1).toString().padStart(2,'0')}`;
    }
    
    pcModal.show();
}

// --- 3. SOFTWARE CHECKBOXES (ดึง AI มาให้ติ๊กเลือก) ---
function renderSoftwareCheckboxes(pcId) {
    const listContainer = document.getElementById('softwareCheckboxList');
    if (!listContainer) return;

    // เช็คว่ามีฟังก์ชัน DB.getSoftwareLib และคืนค่าเป็น Array
    const lib = (DB.getSoftwareLib && typeof DB.getSoftwareLib === 'function' && Array.isArray(DB.getSoftwareLib())) ? DB.getSoftwareLib() : []; 
    
    let installed = [];
    if (pcId) {
        const pcs = Array.isArray(DB.getPCs()) ? DB.getPCs() : [];
        const pc = pcs.find(p => p.id == pcId);
        if (pc && Array.isArray(pc.software)) installed = pc.software;
    }

    listContainer.innerHTML = '';
    
    if (lib.length === 0) {
        listContainer.innerHTML = '<div class="col-12 text-muted small text-center p-3">ไม่พบรายการ Software ในคลัง <br> (ไปเพิ่มที่เมนู Manage AI)</div>';
        return;
    }

    lib.forEach(item => {
        const fullName = `${item.name} (${item.version})`;
        const isChecked = installed.includes(fullName) ? 'checked' : '';
        
        const icon = item.type === 'AI' 
            ? '<i class="bi bi-robot text-primary"></i>' 
            : '<i class="bi bi-hdd-network text-secondary"></i>';

        listContainer.innerHTML += `
            <div class="col-md-6">
                <div class="form-check bg-white p-2 rounded border h-100">
                    <input class="form-check-input ms-1" type="checkbox" value="${fullName}" id="sw_${item.id}" ${isChecked}>
                    <label class="form-check-label ms-2 small fw-bold w-100 cursor-pointer" for="sw_${item.id}">
                        ${icon} ${item.name} <span class="text-muted fw-normal">v.${item.version}</span>
                    </label>
                </div>
            </div>
        `;
    });
}

// --- 4. SAVE DATA (บันทึก) ---
function savePC() {
    const id = document.getElementById('editPcId').value;
    const name = document.getElementById('editPcName').value.trim();
    const status = document.getElementById('editPcStatus').value;

    if (!name) {
        alert("กรุณาระบุชื่อเครื่อง");
        return;
    }

    const checkboxes = document.querySelectorAll('#softwareCheckboxList input:checked');
    const selectedSoftware = Array.from(checkboxes).map(cb => cb.value);

    let pcs = Array.isArray(DB.getPCs()) ? DB.getPCs() : [];

    if (id) {
        // Update
        const index = pcs.findIndex(p => p.id == id);
        if (index !== -1) {
            pcs[index].name = name;
            pcs[index].status = status;
            pcs[index].software = selectedSoftware;
            
            if(status === 'available') { 
                pcs[index].currentUser = null; 
                pcs[index].startTime = null; 
            } else if (status === 'in_use') {
                 if (!pcs[index].currentUser) {
                    pcs[index].currentUser = "Admin Set (Manual)";
                    pcs[index].startTime = Date.now();
                }
            }
        }
    } else {
        // Create New
        let maxId = 0;
        pcs.forEach(p => { let num = parseInt(p.id); if (!isNaN(num) && num > maxId) maxId = num; });
        const newId = (maxId + 1).toString();

        pcs.push({
            id: newId, 
            name, 
            status, 
            software: selectedSoftware, 
            currentUser: (status === 'in_use') ? "Admin Set" : null, 
            startTime: (status === 'in_use') ? Date.now() : null
        });
    }

    DB.savePCs(pcs);
    if(pcModal) pcModal.hide();
    renderPCTable();
}

// --- 5. DELETE DATA (ลบ) ---
function deletePC(id) {
    if(confirm('ยืนยันการลบเครื่องนี้?')) {
        let pcs = DB.getPCs().filter(p => p.id != id);
        DB.savePCs(pcs);
        renderPCTable();
    }
}