/* admin-manage.js (Updated Logic for Status Change) */

let pcModal;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof DB === 'undefined') {
        alert("Error: mock-db.js not loaded");
        return;
    }

    // Init Modal
    const modalEl = document.getElementById('pcModal');
    if (modalEl) pcModal = new bootstrap.Modal(modalEl);

    // Render
    renderPCTable();
});

// --- 1. RENDER TABLE ---
function renderPCTable() {
    const tbody = document.getElementById('pcTableBody');
    const pcs = DB.getPCs() || [];
    
    tbody.innerHTML = '';

    if (pcs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`;
        return;
    }

    pcs.forEach(pc => {
        const id = pc.id || '?';
        const name = pc.name || 'Unknown';
        const status = pc.status || 'maintenance';
        
        // กำหนดสีและข้อความตามสถานะ (ตามโจทย์)
        let statusBadge = '';
        switch(status) {
            case 'available': 
                statusBadge = '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Available</span>'; 
                break;
            case 'in_use': 
                statusBadge = '<span class="badge bg-danger"><i class="bi bi-person-workspace me-1"></i>In Use</span>'; 
                break;
            case 'reserved': 
                statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-bookmark-fill me-1"></i>Reserved</span>'; 
                break;
            case 'maintenance': 
                statusBadge = '<span class="badge bg-secondary"><i class="bi bi-wrench me-1"></i>Maintenance</span>'; 
                break;
            default:
                statusBadge = '<span class="badge bg-light text-dark border">Unknown</span>';
        }
        
        // Software Badges
        let softBadges = '<span class="text-muted small">-</span>';
        if (Array.isArray(pc.software) && pc.software.length > 0) {
            softBadges = pc.software.map(s => {
                let isAI = s.toLowerCase().includes('ai') || s.toLowerCase().includes('gpt') || s.toLowerCase().includes('gemini');
                let color = isAI ? 'bg-primary bg-opacity-10 text-primary border-primary' : 'bg-light text-dark border';
                return `<span class="badge ${color} border me-1 fw-normal">${s}</span>`;
            }).join('');
        }

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 text-muted fw-bold">#${id}</td>
                <td><span class="fw-bold text-primary">${name}</span></td>
                <td>${statusBadge}</td>
                <td>${softBadges}</td>
                <td class="text-end pe-4">
                    <button onclick="openPCModal('${id}')" class="btn btn-sm btn-outline-primary shadow-sm me-1">
                        <i class="bi bi-pencil-square"></i> แก้ไข/เปลี่ยนสถานะ
                    </button>
                    <button onclick="deletePC('${id}')" class="btn btn-sm btn-outline-danger shadow-sm">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// --- 2. OPEN MODAL ---
function openPCModal(id = null) {
    const modalTitle = document.getElementById('pcModalTitle');
    
    // Reset Values
    document.getElementById('editPcId').value = '';
    document.getElementById('editPcName').value = '';
    document.getElementById('editPcStatus').value = 'available'; // Default

    // Load Checkboxes
    renderSoftwareCheckboxes(id);

    if (id) {
        // Edit Mode
        modalTitle.innerText = `แก้ไข / เปลี่ยนสถานะ PC-${id}`;
        const pc = DB.getPCs().find(p => p.id == id);
        if (pc) {
            document.getElementById('editPcId').value = pc.id;
            document.getElementById('editPcName').value = pc.name;
            // Set Status เดิมของเครื่อง
            document.getElementById('editPcStatus').value = pc.status; 
        }
    } else {
        // Add Mode
        modalTitle.innerText = 'เพิ่มเครื่องใหม่';
        const pcs = DB.getPCs();
        // Gen ID
        let maxId = 0;
        pcs.forEach(p => { let n = parseInt(p.id); if(!isNaN(n) && n > maxId) maxId = n; });
        document.getElementById('editPcName').value = `PC-${(maxId+1).toString().padStart(2,'0')}`;
    }
    
    pcModal.show();
}

// --- 3. RENDER CHECKBOXES (ดึงมาจาก Manage AI) ---
function renderSoftwareCheckboxes(pcId) {
    const listContainer = document.getElementById('softwareCheckboxList');
    const lib = (DB.getSoftwareLib && typeof DB.getSoftwareLib === 'function') ? DB.getSoftwareLib() : [];
    const pcs = DB.getPCs();
    
    let installed = [];
    if (pcId) {
        const pc = pcs.find(p => p.id == pcId);
        if (pc && pc.software) installed = pc.software;
    }

    listContainer.innerHTML = '';
    
    if (lib.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-muted small p-2">ไม่พบรายการ Software (ไปเพิ่มที่เมนู Manage AI)</div>';
        return;
    }

    lib.forEach(item => {
        const fullName = `${item.name} (${item.version})`;
        const isChecked = installed.includes(fullName) ? 'checked' : '';
        const icon = item.type === 'AI' ? '<i class="bi bi-robot text-primary"></i>' : '<i class="bi bi-hdd-network"></i>';
        
        listContainer.innerHTML += `
            <div class="col-md-6">
                <div class="form-check bg-white p-2 border rounded">
                    <input class="form-check-input ms-1" type="checkbox" value="${fullName}" id="sw_${item.id}" ${isChecked}>
                    <label class="form-check-label ms-2 small fw-bold w-100 cursor-pointer" for="sw_${item.id}">
                        ${icon} ${item.name}
                    </label>
                </div>
            </div>
        `;
    });
}

// --- 4. SAVE (สำคัญ: จัดการ Logic เปลี่ยนสถานะ) ---
function savePC() {
    const id = document.getElementById('editPcId').value;
    const name = document.getElementById('editPcName').value.trim();
    const status = document.getElementById('editPcStatus').value; // ค่าสถานะใหม่

    if (!name) return alert("กรุณาระบุชื่อเครื่อง");

    const checkboxes = document.querySelectorAll('#softwareCheckboxList input:checked');
    const selectedSoftware = Array.from(checkboxes).map(cb => cb.value);

    let pcs = DB.getPCs();

    if (id) {
        // --- กรณีแก้ไข (Update) ---
        const index = pcs.findIndex(p => p.id == id);
        if (index !== -1) {
            pcs[index].name = name;
            pcs[index].status = status;
            pcs[index].software = selectedSoftware;

            // Logic พิเศษเมื่อเปลี่ยนสถานะ
            if (status === 'available') {
                // ถ้าเปลี่ยนเป็น "ว่าง" -> เคลียร์คนใช้งาน
                pcs[index].currentUser = null;
                pcs[index].startTime = null;
            } else if (status === 'in_use') {
                // ถ้าแอดมินบังคับเป็น "ใช้งาน" -> ใส่ชื่อ Admin ไว้กันระบบรวน
                if (!pcs[index].currentUser) {
                    pcs[index].currentUser = "Admin Set (Manual)";
                    pcs[index].startTime = Date.now();
                }
            }
            // Reserved / Maintenance ไม่ต้องทำอะไรพิเศษ (แค่เปลี่ยนสี)
        }
    } else {
        // --- กรณีเพิ่มใหม่ (Create) ---
        let maxId = 0;
        pcs.forEach(p => { let n = parseInt(p.id); if(!isNaN(n) && n > maxId) maxId = n; });
        const newId = (maxId + 1).toString();

        pcs.push({
            id: newId,
            name: name,
            status: status,
            software: selectedSoftware,
            currentUser: (status === 'in_use') ? "Admin Set" : null,
            startTime: (status === 'in_use') ? Date.now() : null
        });
    }

    DB.savePCs(pcs);
    pcModal.hide();
    renderPCTable();
}

// --- 5. DELETE ---
function deletePC(id) {
    if(confirm('ยืนยันลบเครื่องนี้?')) {
        let pcs = DB.getPCs().filter(p => p.id != id);
        DB.savePCs(pcs);
        renderPCTable();
    }
}