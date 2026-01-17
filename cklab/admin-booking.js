/* admin-booking.js (Final: Validation + Smart Import + Download Template 17/01/2026) */

let bookingModal;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Init Modal
    const modalEl = document.getElementById('bookingModal');
    if (modalEl) bookingModal = new bootstrap.Modal(modalEl);

    // 2. Set Default Date
    const dateFilter = document.getElementById('bookingDateFilter');
    if (dateFilter) dateFilter.valueAsDate = new Date();

    // 3. Render Table
    renderBookings();
    
    // 4. Init Options
    initFormOptions();

    // ✅ เพิ่ม Event Listener: เมื่อเปลี่ยน "วันที่" หรือ "เวลา" ให้เช็คสถานะเครื่องใหม่ทันที
    document.getElementById('bkDate').addEventListener('change', filterPCList);
    document.getElementById('bkTimeSlot').addEventListener('change', filterPCList);
});

// ==========================================
// 0. INIT OPTIONS
// ==========================================
function initFormOptions() {
    // โหลดรายชื่อ Software ลงตัวกรอง
    const swFilter = document.getElementById('bkSoftwareFilter');
    if (swFilter) {
        const lib = DB.getSoftwareLib();
        if (lib && lib.length > 0) {
            swFilter.innerHTML = '<option value="">-- ไม่ระบุ (แสดงทั้งหมด) --</option>';
            lib.sort((a, b) => a.name.localeCompare(b.name));
            lib.forEach(sw => {
                swFilter.innerHTML += `<option value="${sw.name}">${sw.name}</option>`;
            });
        } else {
            swFilter.innerHTML = '<option value="">(ไม่พบข้อมูล Software)</option>';
            swFilter.disabled = true;
        }
    }
    
    // โหลด PC ครั้งแรก (ใช้ค่า Default วัน/เวลา)
    filterPCList();
}

// ==========================================
// 🔍 FILTER & AVAILABILITY LOGIC
// ==========================================
function filterPCList() {
    const pcSelect = document.getElementById('bkPcSelect');
    if (!pcSelect) return;

    // 1. ดึงค่า Filter ต่างๆ
    const swName = document.getElementById('bkSoftwareFilter').value.toLowerCase();
    const selDate = document.getElementById('bkDate').value;
    const selTimeSlot = document.getElementById('bkTimeSlot').value; 

    // ถ้ายังไม่เลือกวันเวลา
    if (!selDate || !selTimeSlot) {
        pcSelect.innerHTML = '<option value="">-- กรุณาเลือกวันและเวลาก่อน --</option>';
        return;
    }

    // แกะเวลา Start/End ที่เลือก
    const [selStart, selEnd] = selTimeSlot.split('-');

    // ดึงข้อมูล
    const pcs = DB.getPCs();
    const bookings = DB.getBookings();
    
    // เรียงชื่อเครื่อง
    pcs.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

    const currentValue = pcSelect.value;

    pcSelect.innerHTML = '<option value="">-- เลือกเครื่อง --</option>';
    let count = 0;

    pcs.forEach(pc => {
        // --- A. กรองด้วย Software ---
        let hasSoftware = true;
        if (swName !== "") {
            hasSoftware = pc.installedSoftware && pc.installedSoftware.some(s => s.toLowerCase().includes(swName));
        }

        if (!hasSoftware) return;

        // --- B. เช็คสถานะ "ปิดปรับปรุง" ---
        if (pc.status === 'maintenance') {
            pcSelect.innerHTML += `<option value="${pc.id}" disabled style="color: #6c757d;">🔴 ${pc.name} (แจ้งซ่อม/ปิดปรับปรุง)</option>`;
            count++;
            return;
        }

        // --- C. เช็คคิวว่าง (Availability Check) ---
        const isConflict = bookings.some(b => {
            if (String(b.pcId) !== String(pc.id)) return false;
            if (b.date !== selDate) return false;
            if (!['approved', 'pending', 'in_use'].includes(b.status)) return false;

            // เช็คเวลาชน
            return (selStart < b.endTime && selEnd > b.startTime);
        });

        // --- D. สร้าง Option ---
        if (isConflict) {
            pcSelect.innerHTML += `<option value="${pc.id}" disabled style="color: #dc3545;">❌ ${pc.name} (ไม่ว่าง - จองแล้ว)</option>`;
        } else {
            const selected = (String(pc.id) === String(currentValue)) ? 'selected' : '';
            pcSelect.innerHTML += `<option value="${pc.id}" ${selected} style="color: #198754;">🟢 ${pc.name} (ว่าง)</option>`;
        }
        count++;
    });

    if (count === 0) {
        pcSelect.innerHTML = `<option value="" disabled>❌ ไม่พบเครื่องที่มีโปรแกรมนี้</option>`;
    }
    
    updateSoftwareList();
}

function updateSoftwareList() {
    const pcId = document.getElementById('bkPcSelect').value;
    const container = document.getElementById('aiCheckboxList');
    
    const hint = document.getElementById('pcSoftwareHint');
    if(hint) hint.innerText = "";

    if (!container) return;

    container.innerHTML = '';

    if (!pcId) {
        container.innerHTML = '<span class="text-muted small fst-italic">กรุณาเลือกเครื่องก่อน...</span>';
        return;
    }

    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    if (pc && pc.installedSoftware && pc.installedSoftware.length > 0) {
        pc.installedSoftware.forEach((sw, index) => {
            const div = document.createElement('div');
            div.className = 'form-check form-check-inline mb-1';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" id="sw_chk_${index}" value="${sw}">
                <label class="form-check-label small" for="sw_chk_${index}">${sw}</label>
            `;
            container.appendChild(div);
        });
    } else {
        container.innerHTML = '<span class="text-muted small">- ไม่พบรายการ Software ในเครื่องนี้ -</span>';
    }
}

// ==========================================
// 1. RENDER TABLE
// ==========================================
function renderBookings() {
    const tbody = document.getElementById('bookingTableBody');
    if(!tbody) return;

    let bookings = DB.getBookings();
    const filterDate = document.getElementById('bookingDateFilter').value;
    const filterStatus = document.getElementById('bookingStatusFilter').value;

    tbody.innerHTML = '';

    const filtered = bookings.filter(b => {
        if (filterDate && b.date !== filterDate) return false;
        if (filterStatus !== 'all' && b.status !== filterStatus) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">ไม่มีรายการจองในช่วงเวลานี้</td></tr>`;
        return;
    }

    filtered.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
    });

    filtered.forEach(b => {
        let badgeClass = '', statusText = '', actionBtns = '';

        switch(b.status) {
            case 'pending': 
            case 'approved':
                badgeClass = 'bg-warning text-dark border border-warning'; 
                statusText = '🟡 จองแล้ว (Booked)';
                actionBtns = `
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="updateStatus('${b.id}', 'no_show')" title="แจ้ง No Show"><i class="bi bi-person-x"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="updateStatus('${b.id}', 'rejected')" title="ยกเลิก"><i class="bi bi-trash"></i></button>
                `;
                break;
            case 'completed':
                badgeClass = 'bg-success'; statusText = '🟢 ใช้งานเสร็จสิ้น'; break;
            case 'no_show':
                badgeClass = 'bg-secondary'; statusText = '⚪ No Show'; break;
            case 'rejected':
                badgeClass = 'bg-danger bg-opacity-75'; statusText = '❌ ยกเลิกแล้ว'; break;
        }

        let softwareDisplay = '-';
        if (b.softwareList && b.softwareList.length > 0) {
            softwareDisplay = b.softwareList.map(sw => `<span class="badge bg-info text-dark border border-info bg-opacity-25 me-1">${sw}</span>`).join('');
        } else if (b.type === 'General') {
            softwareDisplay = '<span class="badge bg-light text-secondary border">ทั่วไป</span>';
        } else if (b.type === 'AI') {
            softwareDisplay = '<span class="badge bg-primary bg-opacity-10 text-primary border border-primary"><i class="bi bi-robot me-1"></i>AI Workstation</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 fw-bold text-dark">${formatDate(b.date)}</td>
            <td class="text-primary fw-bold">${b.startTime} - ${b.endTime}</td>
            <td>
                <div class="fw-bold text-dark">${b.userName}</div>
                <div class="small text-muted" style="font-size: 0.75rem;">${b.userId}</div>
            </td>
            <td><span class="badge bg-light text-dark border">${b.pcName}</span></td>
            <td>${softwareDisplay}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="text-end pe-4">${actionBtns}</td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDate(dateStr) {
    if(!dateStr) return "-";
    const parts = dateStr.split('-');
    if(parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function updateStatus(id, newStatus) {
    if (newStatus === 'rejected' && !confirm("ยืนยันการยกเลิกรายการจองนี้?")) return;

    let bookings = DB.getBookings();
    const index = bookings.findIndex(b => b.id === id);
    if (index !== -1) {
        const booking = bookings[index];
        booking.status = newStatus;
        DB.saveBookings(bookings);
        
        if (newStatus === 'no_show' || newStatus === 'rejected') {
            const pcs = DB.getPCs();
            const pc = pcs.find(p => String(p.id) === String(booking.pcId));
            if (pc && pc.status === 'reserved' && pc.currentUser === booking.userName) {
                DB.updatePCStatus(booking.pcId, 'available', null);
            }
        }
        renderBookings();
    }
}

// ==========================================
// 2. MODAL & SAVE LOGIC
// ==========================================

function openBookingModal() {
    const today = new Date().toISOString().split('T')[0];
    
    const dateInput = document.getElementById('bkDate');
    if(dateInput) {
        dateInput.value = today;
        dateInput.removeAttribute('min');
        dateInput.removeAttribute('max');
    }

    if(document.getElementById('bkPcSelect')) document.getElementById('bkPcSelect').value = '';
    if(document.getElementById('bkTimeSlot')) document.getElementById('bkTimeSlot').value = '09:00-10:30';
    if(document.getElementById('bkUser')) document.getElementById('bkUser').value = '';
    if(document.getElementById('bkTypeSelect')) document.getElementById('bkTypeSelect').value = 'General';
    if(document.getElementById('bkSoftwareFilter')) document.getElementById('bkSoftwareFilter').value = '';
    
    filterPCList(); 
    toggleSoftwareList(); 
    
    const hint = document.getElementById('pcSoftwareHint');
    if(hint) hint.innerText = '';

    if(bookingModal) bookingModal.show();
}

function saveBooking() {
    const pcId = document.getElementById('bkPcSelect').value;
    const date = document.getElementById('bkDate').value;
    const timeSlotStr = document.getElementById('bkTimeSlot').value; 
    const userId = document.getElementById('bkUser').value.trim();
    const type = document.getElementById('bkTypeSelect').value;

    if (!pcId || !date || !timeSlotStr || !userId) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    // Validation
    const parts = date.split('-');
    const selDate = new Date(parts[0], parts[1] - 1, parts[2]); 
    const today = new Date(); 
    today.setHours(0,0,0,0); 

    const diffTime = selDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
        alert("⚠️ ไม่สามารถจองล่วงหน้าเกิน 1 วันได้\n(ระบบอนุญาตให้จองได้เฉพาะวันนี้และพรุ่งนี้เท่านั้น)");
        return;
    }

    const [start, end] = timeSlotStr.split('-');

    // Conflict Check
    const bookings = DB.getBookings();
    const isDup = bookings.some(b => 
        b.date === date && 
        String(b.pcId) === String(pcId) && 
        ['approved', 'pending', 'in_use'].includes(b.status) &&
        (start < b.endTime && end > b.startTime)
    );

    if (isDup) {
        alert("⚠️ เครื่องนี้ถูกจองไปแล้วในช่วงเวลาดังกล่าว กรุณาเลือกเครื่องอื่น");
        return;
    }
    
    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(pcId));

    let selectedSoftware = [];
    const checkboxes = document.querySelectorAll('#aiCheckboxList input:checked');
    checkboxes.forEach(cb => {
        selectedSoftware.push(cb.value);
    });

    const newBooking = {
        id: 'b_' + Date.now(),
        userId: userId,
        userName: userId, 
        pcId: pcId,
        pcName: pc ? pc.name : 'Unknown',
        date: date,
        startTime: start,
        endTime: end,
        status: 'approved',
        type: type,
        softwareList: selectedSoftware 
    };

    bookings.push(newBooking);
    DB.saveBookings(bookings);
    
    alert("บันทึกการจองเรียบร้อย");
    if(bookingModal) bookingModal.hide();
    renderBookings();
}

function deleteBooking(id) {
    if(!confirm("ยืนยันลบข้อมูลการจองนี้?")) return;
    let bookings = DB.getBookings();
    bookings = bookings.filter(b => b.id !== id);
    DB.saveBookings(bookings);
    renderBookings();
}

function toggleSoftwareList() {
    const type = document.getElementById('bkTypeSelect').value;
    const box = document.getElementById('aiSelectionBox');
    if (box) {
        if (type === 'AI') box.classList.remove('d-none');
        else box.classList.add('d-none');
    }
}

function handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { processCSVData(e.target.result); };
    reader.readAsText(file);
    input.value = ''; 
}

// ==========================================
// 3. IMPORT CSV LOGIC
// ==========================================

function processCSVData(csvText) {
    const lines = csvText.split(/\r\n|\n/).map(l => l.trim()).filter(l => l);

    if (lines.length < 2) {
        alert("❌ ไฟล์ CSV ต้องมีอย่างน้อย 2 บรรทัด (Header + Data)");
        return;
    }

    const header = lines[0];
    const commaCount = (header.match(/,/g) || []).length;
    const semiCount = (header.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    const dataLines = lines.slice(1);
    let successCount = 0;
    let failCount = 0;
    let errorLog = [];

    const bookings = DB.getBookings();
    const newBookings = [];

    dataLines.forEach((line, index) => {
        if (!line) return;

        try {
            const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            // ต้องมีอย่างน้อย 9 คอลัมน์
            if (cols.length < 9) {
                throw new Error(`คอลัมน์ไม่ครบ (ต้องการ 9 ช่อง)`);
            }

            // Mapping ข้อมูลตาม Template:
            // 0:User, 1:Name, 2:Status, 3:Phone, 4:Email, 5:PC_Name, 6:Software, 7:Date, 8:Time
            const userId = cols[0];
            const userName = cols[1];
            const pcNameStr = cols[5]; // PC
            const softwareStr = cols[6]; // Software
            const dateStr = cols[7];      
            const timeRange = cols[8];    

            const isoDate = convertDateToISO(dateStr);
            if (!isoDate) throw new Error(`รูปแบบวันที่ผิด`);

            if (!timeRange.includes('-')) throw new Error(`รูปแบบเวลาผิด`);
            const [startTime, endTime] = timeRange.split('-');

            const pcInfo = findPcFromResourceName(pcNameStr);
            if (!pcInfo) throw new Error(`ไม่พบเครื่อง "${pcNameStr}"`);

            let softwareList = [];
            if (softwareStr && softwareStr !== '-') {
                softwareList = softwareStr.split(/[+;]/).map(s => s.trim());
            }

            const isAI = softwareList.some(s => s.toLowerCase().match(/(gpt|ai|claude|midjourney)/));

            const newBooking = {
                id: 'b_imp_' + Date.now() + Math.floor(Math.random() * 10000),
                userId: userId,
                userName: userName,
                pcId: pcInfo.id,
                pcName: pcInfo.name,
                date: isoDate,
                startTime: startTime.trim(),
                endTime: endTime.trim(),
                status: 'approved',
                type: isAI ? 'AI' : 'General',
                softwareList: softwareList 
            };

            newBookings.push(newBooking);
            successCount++;

        } catch (err) {
            failCount++;
            if (errorLog.length < 5) {
                errorLog.push(`บรรทัด ${index + 2}: ${err.message}`);
            }
        }
    });

    if (successCount > 0) {
        const updatedBookings = [...bookings, ...newBookings];
        DB.saveBookings(updatedBookings);
        renderBookings();
        
        let msg = `✅ นำเข้าสำเร็จ: ${successCount} รายการ`;
        if (failCount > 0) {
            msg += `\n⚠️ ล้มเหลว: ${failCount} รายการ\n\nตัวอย่างข้อผิดพลาด:\n${errorLog.join('\n')}`;
        }
        alert(msg);
    } else {
        alert(`❌ ไม่สามารถนำเข้าข้อมูลได้เลย (${failCount} รายการ)\n\nสาเหตุ:\n${errorLog.join('\n')}`);
    }
}

function convertDateToISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    
    let day = parseInt(parts[0]);
    let month = parseInt(parts[1]);
    let year = parseInt(parts[2]);

    if (year > 2400) year -= 543; 
    
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function findPcFromResourceName(resourceName) {
    const pcs = DB.getPCs();
    const cleanName = resourceName.toLowerCase().trim();

    const matches = cleanName.match(/(\d+)/); 
    if (matches) {
        const number = parseInt(matches[0]).toString(); 
        let found = pcs.find(p => String(p.id) === number);
        if (found) return found;
        found = pcs.find(p => p.name.includes(number.padStart(2, '0')));
        if (found) return found;
    }

    return pcs.find(p => cleanName.includes(p.name.toLowerCase()));
}

// ==========================================
// 4. TEMPLATE DOWNLOAD LOGIC (Updated: 17/01/2026)
// ==========================================

function downloadCSVTemplate() {
    // 1. กำหนดหัวตาราง (แยก PC และ Software)
    const headers = [
        "รหัสผู้ใช้งาน",
        "ชื่อ-สกุล",
        "สถานะ",
        "เบอร์โทร",
        "อีเมล",
        "เครื่องที่ใช้ (PC)",      // Col 5
        "Software / AI ที่จอง",    // Col 6
        "วันที่ใช้บริการ",        // Col 7
        "ช่วงเวลาใช้บริการ",      // Col 8
        "รหัสคณะ/สำนัก"
    ];

    // 2. สร้างข้อมูลตัวอย่าง (แก้ไขวันที่เป็น 17/01/2026)
    const sampleRows = [
        ["66123456", "นายสมชาย ตัวอย่าง", "นักศึกษา", "081-123-4567", "-", "PC-01", "VS Code", "17/01/2026", "09:00-10:30", "EN"],
        ["guest001", "นางสมหญิง ทดสอบ", "บุคคลภายนอก", "-", "-", "PC-05", "ChatGPT Plus + Midjourney", "17/01/2026", "13:00-15:00", "-"]
    ];

    // 3. ประกอบร่าง CSV (ใส่ BOM เพื่อรองรับภาษาไทย)
    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    sampleRows.forEach(row => {
        // Handle comma in data by quoting
        const safeRow = row.map(cell => cell.includes(',') ? `"${cell}"` : cell);
        csvContent += safeRow.join(",") + "\n";
    });

    // 4. สั่งดาวน์โหลด
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", "booking_template.csv"); 
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}