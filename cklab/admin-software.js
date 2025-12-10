/* admin-software.js */

let softwareModal;

document.addEventListener('DOMContentLoaded', () => {
    // 1. เช็คสิทธิ์ Admin
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 2. Init Modal
    softwareModal = new bootstrap.Modal(document.getElementById('softwareModal'));

    // 3. Render Table
    renderTable();
});

function renderTable() {
    const tbody = document.getElementById('softwareTableBody');
    const lib = DB.getSoftwareLib(); // ดึงข้อมูลจาก mock-db

    tbody.innerHTML = '';

    if (lib.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่พบข้อมูล (กดปุ่มเพิ่มรายการใหม่)</td></tr>`;
        return;
    }

    lib.forEach(item => {
        let typeBadge = item.type === 'AI' 
            ? '<span class="badge bg-primary"><i class="bi bi-robot me-1"></i>AI Tool</span>' 
            : '<span class="badge bg-secondary"><i class="bi bi-hdd me-1"></i>Software</span>';

        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold">${item.name}</td>
                <td>${item.version}</td>
                <td>${typeBadge}</td>
                <td class="text-end pe-4">
                    <button onclick="openModal('${item.id}')" class="btn btn-sm btn-outline-primary me-1">
                        <i class="bi bi-pencil-fill"></i> แก้ไข
                    </button>
                    <button onclick="deleteItem('${item.id}')" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash-fill"></i> ลบ
                    </button>
                </td>
            </tr>
        `;
    });
}

function openModal(id = null) {
    const modalTitle = document.getElementById('modalTitle');
    document.getElementById('editId').value = '';
    document.getElementById('editName').value = '';
    document.getElementById('editVersion').value = '';
    document.getElementById('editType').value = 'AI';

    if (id) {
        modalTitle.innerText = 'แก้ไขข้อมูล';
        const lib = DB.getSoftwareLib();
        const item = lib.find(i => i.id == id);
        if (item) {
            document.getElementById('editId').value = item.id;
            document.getElementById('editName').value = item.name;
            document.getElementById('editVersion').value = item.version;
            document.getElementById('editType').value = item.type;
        }
    } else {
        modalTitle.innerText = 'เพิ่มรายการใหม่';
    }

    softwareModal.show();
}

function saveSoftware() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const version = document.getElementById('editVersion').value.trim();
    const type = document.getElementById('editType').value;

    if (!name || !version) return alert("กรุณากรอกข้อมูลให้ครบ");

    let lib = DB.getSoftwareLib();

    if (id) {
        // Edit
        const idx = lib.findIndex(i => i.id == id);
        if (idx !== -1) {
            lib[idx].name = name;
            lib[idx].version = version;
            lib[idx].type = type;
        }
    } else {
        // Add
        const newId = 'sw_' + Date.now();
        lib.push({ id: newId, name, version, type });
    }

    DB.saveSoftwareLib(lib);
    softwareModal.hide();
    renderTable();
}

function deleteItem(id) {
    if (confirm('ยืนยันลบรายการนี้?')) {
        let lib = DB.getSoftwareLib().filter(i => i.id != id);
        DB.saveSoftwareLib(lib);
        renderTable();
    }
}