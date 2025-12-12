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
    
    // Get Filters
    const filterDate = document.getElementById('bookingDateFilter').value;
    const filterStatus = document.getElementById('bookingStatusFilter').value;

    tbody.innerHTML = '';

    // Filter Logic
    const filtered = bookings.filter(b => {
        if (filterDate && b.date !== filterDate) return false;
        if (filterStatus !== 'all' && b.status !== filterStatus) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่มีรายการจองในวันนี้</td></tr>`;
        return;
    }

    // เรียงลำดับตามเวลาเริ่ม
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

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-primary">${b.startTime} - ${b.endTime}</td>
            <td>
                <div class="fw-bold">${b.userName}</div>
                <div class="small text-muted">${b.userId}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${b.pcName}</span></td>
            <td class="small text-muted">${b.note || '-'}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="text-end pe-4">${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- HELPER: CHECK OVERLAP ---
function checkTimeOverlap(pcId, date, start, end) {
    const bookings = DB.getBookings();
    
    // แปลงเวลาเป็นนาทีเพื่อเปรียบเทียบง่ายๆ (เช่น 09:30 -> 570)
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const newStart = toMinutes(start);
    const newEnd = toMinutes(end);

    // วนลูปหาว่ามีการจองไหนทับซ้อนไหม
    const conflict = bookings.find(b => {
        // ต้องเป็นวันเดียวกัน + เครื่องเดียวกัน + สถานะไม่ใช่ Rejected
        if (b.pcId === String(pcId) && b.date === date && b.status !== 'rejected') {
            const bStart = toMinutes(b.startTime);
            const bEnd = toMinutes(b.endTime);

            // สูตรเช็คช่วงเวลาทับกัน: (StartA < EndB) && (EndA > StartB)
            return (newStart < bEnd && newEnd > bStart);
        }
        return false;
    });

    return conflict; // คืนค่า Booking ที่ชนกัน (ถ้ามี) หรือ undefined (ถ้าไม่มี)
}

// --- ACTIONS ---

// อัปเดตสถานะ (Approve / Reject)
function updateStatus(id, newStatus) {
    let bookings = DB.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
        bookings[index].status = newStatus;
        DB.saveBookings(bookings);
        
        // ถ้าเป็นการ Reject จองของวันนี้ ให้ปลดล็อกเครื่องด้วย (Optional)
        if (newStatus === 'rejected') {
             const booking = bookings[index];
             const todayStr = new Date().toISOString().split('T')[0];
             if (booking.date === todayStr) {
                 // อาจจะ reset เป็น available (แต่ต้องระวังไปทับคนที่ใช้งานอยู่จริง)
                 // DB.updatePCStatus(booking.pcId, 'available'); 
             }
        }
        
        renderBookings();
    }
}

// เปิด Modal เพิ่มจอง
function openBookingModal() {
    // 1. โหลดรายชื่อ PC ลง Select
    const pcs = DB.getPCs();
    const select = document.getElementById('bkPcSelect');
    select.innerHTML = '';
    
    pcs.forEach(pc => {
        // แสดงชื่อ PC และสถานะ
        const option = document.createElement('option');
        option.value = pc.id;
        option.text = `${pc.name} (${pc.status})`;
        select.appendChild(option);
    });

    // 2. Set Default Values
    const now = new Date();
    document.getElementById('bkUser').value = '';
    document.getElementById('bkDate').value = now.toISOString().split('T')[0]; // Set date input to today
    document.getElementById('bkTimeStart').value = '09:00';
    document.getElementById('bkTimeEnd').value = '12:00';
    document.getElementById('bkNote').value = '';

    if(bookingModal) bookingModal.show();
}

// บันทึกการจองใหม่ (รวม Logic ทั้งหมดไว้ที่นี่)
function saveBooking() {
    // 1. รับค่าจากฟอร์ม
    const pcId = document.getElementById('bkPcSelect').value;
    const date = document.getElementById('bkDate').value;
    const start = document.getElementById('bkTimeStart').value;
    const end = document.getElementById('bkTimeEnd').value;
    const userName = document.getElementById('bkUser').value.trim();
    const note = document.getElementById('bkNote').value.trim();

    if (!userName || !date || !start || !end) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    // 2. เช็คเวลา (Start ต้องน้อยกว่า End)
    if (start >= end) {
        alert("❌ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
        return;
    }

    // 3. เช็คจองซ้อน
    const conflict = checkTimeOverlap(pcId, date, start, end);
    if (conflict) {
        alert(`❌ ไม่สามารถจองได้! \nเครื่องนี้ถูกจองแล้วในช่วงเวลา ${conflict.startTime} - ${conflict.endTime}\nโดย: ${conflict.userName}`);
        return;
    }

    // 4. เตรียมข้อมูลบันทึก
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    const newBooking = {
        id: 'b' + Date.now(),
        userId: 'AdminKey',
        userName: userName,
        pcId: pcId,
        pcName: pc ? pc.name : 'Unknown',
        date: date,
        startTime: start,
        endTime: end,
        note: note,
        status: 'approved' // Admin จองให้ถือว่าอนุมัติเลย
    };

    // 5. บันทึกลง Booking DB
    let bookings = DB.getBookings();
    bookings.push(newBooking);
    DB.saveBookings(bookings);

    // 6. อัปเดตสถานะเครื่อง (เฉพาะกรณีจองของ "วันนี้")
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (date === todayStr) {
        // ส่ง pcId, สถานะ 'reserved', และชื่อผู้จอง ไปอัปเดตที่ Database กลาง
        DB.updatePCStatus(pcId, 'reserved', userName);
        alert('✅ บันทึกการจองสำเร็จ (อัปเดตสถานะหน้า Monitor แล้ว)');
    } else {
        alert('✅ บันทึกการจองล่วงหน้าสำเร็จ');
    }

    if(bookingModal) bookingModal.hide();
    renderBookings();
}