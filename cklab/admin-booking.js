/* admin-booking.js */

let bookingModal;

document.addEventListener('DOMContentLoaded', () => {
    // Init Modal
    const modalEl = document.getElementById('bookingModal');
    if (modalEl) bookingModal = new bootstrap.Modal(modalEl);

    // Set Default Date Filter = Today
    const todayStr = new Date().toISOString().split('T')[0];
    const dateFilter = document.getElementById('bookingDateFilter');
    if(dateFilter) dateFilter.value = todayStr;

    // Render
    renderBookings();
});

// --- RENDER TABLE ---
function renderBookings() {
    const tbody = document.getElementById('bookingTableBody');
    if(!tbody) return;

    const bookings = DB.getBookings();
    const filterDate = document.getElementById('bookingDateFilter').value;
    const filterStatus = document.getElementById('bookingStatusFilter').value;

    tbody.innerHTML = '';

    const filtered = bookings.filter(b => {
        if (filterDate && b.date !== filterDate) return false;
        if (filterStatus !== 'all' && b.status !== filterStatus) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่มีรายการจองในวันนี้</td></tr>`;
        return;
    }

    filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));

    filtered.forEach(b => {
        let badgeClass = '';
        let statusText = '';
        let actionBtns = '';

        switch(b.status) {
            case 'pending':
                badgeClass = 'bg-warning text-dark'; statusText = 'รออนุมัติ';
                actionBtns = `
                    <button class="btn btn-sm btn-success me-1" onclick="updateStatus('${b.id}', 'approved')" title="อนุมัติ"><i class="bi bi-check-lg"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="updateStatus('${b.id}', 'rejected')" title="ปฏิเสธ"><i class="bi bi-x-lg"></i></button>
                `;
                break;
            case 'approved':
                badgeClass = 'bg-success'; statusText = 'อนุมัติแล้ว';
                actionBtns = `<button class="btn btn-sm btn-outline-danger" onclick="updateStatus('${b.id}', 'rejected')">ยกเลิก</button>`;
                break;
            case 'rejected':
                badgeClass = 'bg-secondary'; statusText = 'ไม่อนุมัติ';
                actionBtns = `<button class="btn btn-sm btn-outline-secondary" disabled>ยกเลิกแล้ว</button>`;
                break;
        }

        // แสดง Software ที่จองไว้ด้วย (ถ้ามี)
        let softwareInfo = '';
        if (b.bookedSoftware && b.bookedSoftware.length > 0) {
            softwareInfo = `<div class="mt-1 small text-muted"><i class="bi bi-code-slash me-1"></i>${b.bookedSoftware.join(', ')}</div>`;
        }

        const typeBadge = b.type === 'AI' 
            ? '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary"><i class="bi bi-robot me-1"></i>AI</span>' 
            : '<span class="badge bg-secondary bg-opacity-10 text-secondary border"><i class="bi bi-laptop me-1"></i>General</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-primary">${b.startTime} - ${b.endTime}</td>
            <td>
                <div class="fw-bold">${b.userName}</div>
                <div class="small text-muted">${b.userId}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${b.pcName}</span></td>
            <td>
                ${typeBadge}
                ${softwareInfo}
            </td> 
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="text-end pe-4">${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ... (ส่วน Render และ Modal คงเดิม) ...

// ✅ ฟังก์ชันช่วย: เช็คเวลาทับซ้อน (ใช้ Logic เดิม)
function checkTimeOverlap(pcId, date, start, end) {
    const bookings = DB.getBookings();
    
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const newStart = toMinutes(start);
    const newEnd = toMinutes(end);

    return bookings.find(b => {
        if (b.pcId === String(pcId) && b.date === date && b.status !== 'rejected') {
            const bStart = toMinutes(b.startTime);
            const bEnd = toMinutes(b.endTime);
            // ถ้าเวลาจบคนเก่า = เวลาเริ่มคนใหม่ ถือว่าไม่ซ้อน (อนุญาตให้จองต่อกันได้)
            return (newStart < bEnd && newEnd > bStart); 
        }
        return false;
    });
}

// ✅ ฟังก์ชันใหม่: คำนวณว่าตอนนี้ควรขึ้นชื่อใคร (Smart Update)
function refreshPCStatus(pcId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const bookings = DB.getBookings();
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    if (!pc) return;

    // ถ้ากำลังใช้งานอยู่ (In Use) อย่าไปยุ่งกับเขา
    if (pc.status === 'in_use') return;

    // หาการจองทั้งหมดของ "เครื่องนี้" ใน "วันนี้" ที่ยังไม่ยกเลิก
    const todayBookings = bookings.filter(b => 
        b.pcId === String(pcId) && 
        b.date === todayStr && 
        b.status === 'approved'
    );

    if (todayBookings.length === 0) {
        // ถ้าไม่มีการจองเลย หรือถูกยกเลิกหมด -> คืนสถานะว่าง
        DB.updatePCStatus(pcId, 'available', null);
        return;
    }

    // แปลงเวลาปัจจุบันเป็นนาที
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // เรียงลำดับการจองตามเวลา
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // วนลูปหาว่า "ตอนนี้" ตรงกับช่วงเวลาของใคร
    let activeBooking = null;
    let nextBooking = null;

    for (let b of todayBookings) {
        const start = toMinutes(b.startTime);
        const end = toMinutes(b.endTime);

        if (currentMinutes >= start && currentMinutes < end) {
            activeBooking = b; // เจอคนที่ต้องใช้อยู่ตอนนี้
            break;
        }
        if (start > currentMinutes && !nextBooking) {
            nextBooking = b; // เจอคนที่จะมาใช้คิวต่อไป
        }
    }

    if (activeBooking) {
        // ถึงเวลาจองแล้ว -> ขึ้นชื่อคนนั้นเลย
        DB.updatePCStatus(pcId, 'reserved', activeBooking.userName);
    } else if (nextBooking) {
        // ยังไม่ถึงเวลา แต่มีคิวรอ -> ขึ้นชื่อคนถัดไปรอไว้ (หรือจะปล่อยว่างก็ได้ แล้วแต่ Policy)
        // ในที่นี้ขอให้ขึ้นชื่อคนถัดไป เพื่อกันคนอื่นมาแย่ง
        DB.updatePCStatus(pcId, 'reserved', nextBooking.userName);
    } else {
        // การจองวันนี้จบไปหมดแล้ว (เลยเวลาแล้ว) -> คืนสถานะว่าง
        DB.updatePCStatus(pcId, 'available', null);
    }
}

// ✅ แก้ไข saveBooking ให้เรียกใช้ refreshPCStatus แทนการอัปเดตตรงๆ
function saveBooking() {
    const pcId = document.getElementById('bkPcSelect').value;
    const date = document.getElementById('bkDate').value;
    const inputUser = document.getElementById('bkUser').value.trim();
    
    const timeSlotVal = document.getElementById('bkTimeSlot').value;
    const [start, end] = timeSlotVal.split('-');
    const type = document.getElementById('bkType').value;

    if (!inputUser || !date) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    // 1. Resolve ID to Name
    let finalUserName = inputUser;
    let finalUserId = 'AdminKey';
    const regData = DB.checkRegAPI(inputUser);
    if (regData) {
        finalUserName = regData.prefix + regData.name;
        finalUserId = inputUser;
    }

    // 2. Check AI Software
    let selectedSoftware = [];
    if (type === 'AI') {
        const checkboxes = document.querySelectorAll('input[name="bkSoftware"]:checked');
        selectedSoftware = Array.from(checkboxes).map(cb => cb.value);
        if (selectedSoftware.length === 0) {
            alert("⚠️ กรุณาเลือก AI/Software อย่างน้อย 1 รายการ");
            return;
        }
    }

    // 3. Check Overlap
    const conflict = checkTimeOverlap(pcId, date, start, end);
    if (conflict) {
        alert(`❌ ไม่สามารถจองได้ (เวลาชนกัน)\nจองแล้ว: ${conflict.startTime} - ${conflict.endTime}\nโดย: ${conflict.userName}`);
        return;
    }

    // 4. Save
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    const newBooking = {
        id: 'b' + Date.now(),
        userId: finalUserId,
        userName: finalUserName,
        pcId: pcId,
        pcName: pc ? pc.name : 'Unknown',
        date: date,
        startTime: start,
        endTime: end,
        type: type,
        bookedSoftware: selectedSoftware,
        status: 'approved' 
    };

    let bookings = DB.getBookings();
    bookings.push(newBooking);
    DB.saveBookings(bookings);

    // 5. Smart Update Status
    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
        refreshPCStatus(pcId); // คำนวณใหม่ว่าควรขึ้นชื่อใคร
        alert('✅ บันทึกการจองเรียบร้อย (อัปเดตสถานะตามคิว)');
    } else {
        alert('✅ บันทึกการจองล่วงหน้าสำเร็จ');
    }

    if(bookingModal) bookingModal.hide();
    renderBookings();
}

// ✅ แก้ไข updateStatus ให้เรียกใช้ refreshPCStatus ด้วย
function updateStatus(id, newStatus) {
    let bookings = DB.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
        bookings[index].status = newStatus;
        DB.saveBookings(bookings);
        
        // ถ้ามีการเปลี่ยนแปลงสถานะ (ยกเลิก/อนุมัติ) ให้คำนวณหน้าจอใหม่
        const booking = bookings[index];
        const todayStr = new Date().toISOString().split('T')[0];
        if (booking.date === todayStr) {
            refreshPCStatus(booking.pcId);
        }
        
        renderBookings();
    }
}

function openBookingModal() {
    const pcs = DB.getPCs();
    const select = document.getElementById('bkPcSelect');
    select.innerHTML = '';
    
    pcs.forEach(pc => {
        const option = document.createElement('option');
        option.value = pc.id;
        option.text = `${pc.name} (${pc.status})`;
        select.appendChild(option);
    });

    const now = new Date();
    document.getElementById('bkUser').value = '';
    document.getElementById('bkDate').value = now.toISOString().split('T')[0];
    document.getElementById('bkTimeSlot').selectedIndex = 0; 
    document.getElementById('bkType').value = 'General';

    // สร้าง Checkbox รอไว้
    renderBookingSoftwareOptions();
    // รีเซ็ตการแสดงผล Software section
    toggleBookingSoftware();

    if(bookingModal) bookingModal.show();
}

// ✅ สร้าง Checkbox Software ในหน้า Booking
function renderBookingSoftwareOptions() {
    const container = document.getElementById('bkSoftwareList');
    if (!container) return;
    
    // ดึง Software ทั้งหมด
    const lib = (DB.getSoftwareLib && typeof DB.getSoftwareLib === 'function') ? DB.getSoftwareLib() : [];
    container.innerHTML = '';

    if (lib.length === 0) {
        container.innerHTML = '<div class="col-12 text-muted small">ไม่พบรายการ Software</div>';
        return;
    }

    lib.forEach(item => {
        const fullName = `${item.name} (${item.version})`;
        const icon = item.type === 'AI' ? '<i class="bi bi-robot text-primary"></i>' : '<i class="bi bi-hdd-network text-secondary"></i>';
        
        container.innerHTML += `
            <div class="col-md-6">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="bkSoftware" value="${fullName}" id="bksw_${item.id}">
                    <label class="form-check-label small cursor-pointer" for="bksw_${item.id}">
                        ${icon} ${item.name}
                    </label>
                </div>
            </div>
        `;
    });
}

// ✅ ฟังก์ชันโชว์/ซ่อน กล่อง Software
function toggleBookingSoftware() {
    const type = document.getElementById('bkType').value;
    const section = document.getElementById('bkSoftwareSection');
    
    if (type === 'AI') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
        // เคลียร์ค่าที่ติ๊กไว้ถ้าเปลี่ยนกลับเป็น General
        document.querySelectorAll('input[name="bkSoftware"]').forEach(cb => cb.checked = false);
    }
}

function saveBooking() {
    const pcId = document.getElementById('bkPcSelect').value;
    const date = document.getElementById('bkDate').value;
    const inputUser = document.getElementById('bkUser').value.trim(); // รับค่าที่แอดมินกรอก
    
    // 1. ดึงค่า Time Slot และ Type
    const timeSlotVal = document.getElementById('bkTimeSlot').value;
    const [start, end] = timeSlotVal.split('-');
    const type = document.getElementById('bkType').value;

    if (!inputUser || !date) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    // 2. 🔥 เพิ่ม Logic แปลงรหัสเป็นชื่อ (Resolve ID to Name)
    let finalUserName = inputUser;
    let finalUserId = 'AdminKey'; // ค่า Default ถ้าแอดมินพิมพ์ชื่อเอง

    // ลองค้นหาในฐานข้อมูลว่าสิ่งที่พิมพ์มาเป็นรหัสนักศึกษาหรือไม่?
    const regData = DB.checkRegAPI(inputUser);
    
    if (regData) {
        // ✅ ถ้าเจอ: ใช้ชื่อจริงจากระบบ
        finalUserName = regData.prefix + regData.name;
        finalUserId = inputUser; // เก็บ ID นักศึกษาไว้ด้วย
    } else {
        // ❌ ถ้าไม่เจอ: ใช้ข้อความตามที่แอดมินพิมพ์ (เช่น "คุณวิชัย (Guest)")
        finalUserName = inputUser;
    }

    // 3. ตรวจสอบเงื่อนไข AI (เหมือนเดิม)
    let selectedSoftware = [];
    if (type === 'AI') {
        const checkboxes = document.querySelectorAll('input[name="bkSoftware"]:checked');
        selectedSoftware = Array.from(checkboxes).map(cb => cb.value);
        if (selectedSoftware.length === 0) {
            alert("⚠️ กรุณาเลือก AI/Software อย่างน้อย 1 รายการ");
            return;
        }
    }

    // 4. เช็คจองซ้อน (เหมือนเดิม)
    const conflict = checkTimeOverlap(pcId, date, start, end);
    if (conflict) {
        alert(`❌ ไม่สามารถจองได้! \nเครื่องนี้ถูกจองแล้วในช่วงเวลา ${conflict.startTime} - ${conflict.endTime}\nโดย: ${conflict.userName}`);
        return;
    }

    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    const newBooking = {
        id: 'b' + Date.now(),
        userId: finalUserId,   // ✅ บันทึก ID ที่ถูกต้อง
        userName: finalUserName, // ✅ บันทึกชื่อจริงที่ถูกต้อง
        pcId: pcId,
        pcName: pc ? pc.name : 'Unknown',
        date: date,
        startTime: start,
        endTime: end,
        type: type,
        bookedSoftware: selectedSoftware,
        status: 'approved' 
    };

    let bookings = DB.getBookings();
    bookings.push(newBooking);
    DB.saveBookings(bookings);

    // 5. อัปเดตสถานะเครื่อง (เฉพาะจองของวันนี้)
    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
        // ✅ ส่ง "ชื่อจริง" ไปแสดงที่หน้า Monitor
        DB.updatePCStatus(pcId, 'reserved', finalUserName);
        alert(`✅ บันทึกการจองสำหรับ "${finalUserName}" สำเร็จ`);
    } else {
        alert('✅ บันทึกการจองล่วงหน้าสำเร็จ');
    }

    if(bookingModal) bookingModal.hide();
    renderBookings();
}