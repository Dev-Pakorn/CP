/* admin-config.js */

let adminModal, zoneModal;

document.addEventListener('DOMContentLoaded', () => {
    // 1. เช็ค Database
    if (typeof DB === 'undefined' || typeof DB.getAdmins !== 'function') {
        alert("Critical Error: ไฟล์ mock-db.js ไม่สมบูรณ์ (ขาดฟังก์ชัน getAdmins)");
        return;
    }

    // 2. เช็ค Session
    const session = DB.getSession();
    if (!session || !session.user || session.user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }

    // 3. Init Modals
    const adminModalEl = document.getElementById('adminModal');
    const zoneModalEl = document.getElementById('zoneModal');
    
    if(adminModalEl) adminModal = new bootstrap.Modal(adminModalEl);
    if(zoneModalEl) zoneModal = new bootstrap.Modal(zoneModalEl);

    // 4. Render Data
    renderAdmins();
    renderZones();
});

// --- ADMIN FUNCTIONS ---

function renderAdmins() {
    const tbody = document.getElementById('adminTableBody');
    if(!tbody) return;
    
    const admins = DB.getAdmins();
    tbody.innerHTML = '';

    admins.forEach(admin => {
        tbody.innerHTML += `
            <tr>
                <td class="ps-4 fw-bold text-primary">${admin.name}</td>
                <td><span class="badge bg-light text-dark border">${admin.user}</span></td>
                <td>
                    <div class="input-group input-group-sm" style="width: 150px;">
                        <input type="password" class="form-control border-0 bg-transparent" value="${admin.pass}" id="pass_${admin.id}" readonly>
                        <button class="btn btn-link text-secondary" onclick="togglePass('${admin.id}')">
                            <i class="bi bi-eye-fill" id="eye_${admin.id}"></i>
                        </button>
                    </div>
                </td>
                <td>${admin.role}</td>
                <td class="text-end pe-4">
                    <button onclick="deleteAdmin('${admin.id}')" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function openAdminModal() {
    document.getElementById('adminId').value = '';
    document.getElementById('adminName').value = '';
    document.getElementById('adminUser').value = '';
    document.getElementById('adminPass').value = '';
    
    if(adminModal) adminModal.show();
}

function saveAdmin() {
    // ดึงค่าจาก Form
    const name = document.getElementById('adminName').value.trim();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    const role = document.getElementById('adminRole').value;

    // ตรวจสอบค่าว่าง
    if(!name || !user || !pass) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, Username, Password)');
        return;
    }

    let admins = DB.getAdmins();
    
    // ตรวจสอบ Username ซ้ำ
    const existing = admins.find(a => a.user === user);
    if (existing) {
        alert("Username นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น");
        return;
    }

    // สร้าง ID ใหม่
    const newId = 'a' + Date.now();
    
    // เพิ่มข้อมูล
    admins.push({ id: newId, name, user, pass, role });
    DB.saveAdmins(admins);
    
    // ปิด Modal และรีเฟรชตาราง
    if(adminModal) adminModal.hide();
    renderAdmins();
    alert("✅ เพิ่มผู้ดูแลเรียบร้อย");
}

function deleteAdmin(id) {
    // ป้องกันการลบตัวเอง หรือ Super Admin หลัก (id: a1)
    if (id === 'a1') {
        alert("ไม่สามารถลบ Super Admin หลักได้");
        return;
    }

    if(confirm('ยืนยันลบผู้ดูแลท่านนี้?')) {
        let admins = DB.getAdmins().filter(a => a.id != id);
        DB.saveAdmins(admins);
        renderAdmins();
    }
}

function togglePass(id) {
    const input = document.getElementById(`pass_${id}`);
    const icon = document.getElementById(`eye_${id}`);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('bi-eye-fill');
        icon.classList.add('bi-eye-slash-fill');
    } else {
        input.type = "password";
        icon.classList.remove('bi-eye-slash-fill');
        icon.classList.add('bi-eye-fill');
    }
}

// --- ZONE FUNCTIONS ---

function renderZones() {
    const list = document.getElementById('zoneList');
    if(!list) return;

    const zones = DB.getZones ? DB.getZones() : [];
    list.innerHTML = '';

    zones.forEach(z => {
        list.innerHTML += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span><i class="bi bi-geo-alt me-2 text-muted"></i>${z.name}</span>
                <button onclick="deleteZone('${z.id}')" class="btn btn-sm text-danger"><i class="bi bi-x-circle-fill"></i></button>
            </li>
        `;
    });
}

function openZoneModal() {
    document.getElementById('zoneName').value = '';
    if(zoneModal) zoneModal.show();
}

function saveZone() {
    const name = document.getElementById('zoneName').value.trim();
    if(!name) return;

    let zones = DB.getZones();
    const newId = 'z' + Date.now();
    zones.push({ id: newId, name });
    
    DB.saveZones(zones);
    if(zoneModal) zoneModal.hide();
    renderZones();
}

function deleteZone(id) {
    if(confirm('ยืนยันลบโซนนี้?')) {
        let zones = DB.getZones().filter(z => z.id != id);
        DB.saveZones(zones);
        renderZones();
    }
}