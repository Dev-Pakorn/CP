/* timer.js (Final Fix: Force Bright Text) */

let timerInterval; 

document.addEventListener('DOMContentLoaded', () => {
    if (typeof DB === 'undefined') {
        document.body.innerHTML = '<div class="alert alert-danger m-5 text-center"><h3>❌ Error</h3><p>ไม่พบฐานข้อมูล (DB is not defined)</p></div>';
        return;
    }

    const session = DB.getSession();
    if (!session || !session.startTime) {
        alert('⚠️ ไม่พบข้อมูลการใช้งาน กรุณาลงชื่อเข้าใช้ใหม่');
        window.location.href = 'index.html';
        return;
    }

    const userName = session.user ? session.user.name : 'ผู้ใช้ไม่ระบุชื่อ';
    document.getElementById('userNameDisplay').innerText = userName;
    
    // -------------------------------------------------------------
    // ✅ จุดที่แก้: ปรับสีให้สว่าง 100% ไม่มีการใช้สีจาง (text-white-50) ในส่วนข้อความ
    // -------------------------------------------------------------
    const pcId = session.pcId;
    const pcIdDisplay = pcId ? pcId.toString().padStart(2,'0') : '??';
    
    const pcs = DB.getPCs();
    const currentPc = pcs.find(p => String(p.id) === String(pcId));
    
    // ค่าเริ่มต้น: General Use (แก้จากสีจาง เป็นสีขาวปกติ text-white)
    let labelText = "General Use";
    let labelClass = "text-white fw-normal"; 

    if (currentPc && currentPc.installedSoftware && currentPc.installedSoftware.length > 0) {
        const swFullName = currentPc.installedSoftware[0];
        const swName = swFullName.split('(')[0].trim();
        
        const swLib = DB.getSoftwareLib();
        const swInfo = swLib.find(s => s.name === swName);

        if (swInfo && swInfo.type === 'AI') {
            labelText = swName;
            // ✨ ถ้าเป็น AI ใช้สีเหลืองทอง (text-warning) ให้ตัดกับพื้นน้ำเงินชัดๆ
            labelClass = "text-warning fw-bold"; 
        }
    }

    // อัปเดต HTML: ตัวคั่นใช้สีจางได้ แต่ตัวหนังสือต้องชัด
    const pcNameEl = document.getElementById('pcNameDisplay');
    pcNameEl.innerHTML = `Station: PC-${pcIdDisplay} <span class="text-white-50 fw-normal mx-1">|</span> <span class="${labelClass}" style="letter-spacing: 0.5px;">${labelText}</span>`;
    // -------------------------------------------------------------
    
    if (session.forceEndTime) {
        setupCountdownMode(session);
    } else {
        setupUnlimitedMode();
    }
});

// ... (ฟังก์ชันอื่นๆ คงเดิม) ...

function setupCountdownMode(session) {
    console.log("Mode: Countdown (Slot-based)");
    const label = document.getElementById('timerLabel');
    if(label) label.innerText = "เวลาที่เหลือในรอบนี้ (Remaining Time)";

    updateCountdownSlot(); 
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateCountdownSlot, 1000); 
    
    setInterval(syncWithAdminUpdates, 5000);
}

function setupUnlimitedMode() {
    console.log("Mode: Normal Timer (Elapsed)");
    const label = document.getElementById('timerLabel');
    if(label) label.innerText = "เวลาที่ใช้งานไปแล้ว (Elapsed Time)";
    
    updateTimer(); 
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000); 
    
    setInterval(syncWithAdminUpdates, 5000);
}

function updateTimer() {
    const session = DB.getSession(); 
    if (!session) return;
    const now = Date.now();
    let diff = now - session.startTime;
    if (diff < 0) diff = 0;
    
    const timerDisplay = document.getElementById('timerDisplay');
    if(timerDisplay) {
        timerDisplay.innerText = formatTime(diff);
        timerDisplay.classList.remove('text-danger', 'fw-bold'); 
    }
}

function updateCountdownSlot() {
    const session = DB.getSession();
    if (!session || !session.forceEndTime) {
        setupUnlimitedMode();
        return;
    }

    const endMinutesTotal = parseInt(session.forceEndTime); 
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 
    
    const targetHour = Math.floor(endMinutesTotal / 60);
    const targetMin = endMinutesTotal % 60;
    targetDate.setHours(targetHour, targetMin, 0, 0);

    const diff = targetDate.getTime() - now.getTime();
    const timerDisplay = document.getElementById('timerDisplay');

    if (diff <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        if(timerDisplay) {
            timerDisplay.innerText = "00:00:00";
            timerDisplay.classList.add('text-danger', 'fw-bold');
            timerDisplay.classList.remove('text-dark');
        }
        setTimeout(() => { handleTimeUp(); }, 500);
        return;
    }

    if (timerDisplay) {
        timerDisplay.innerText = formatTime(diff);
        if (diff < 5 * 60 * 1000) { 
            timerDisplay.classList.remove('text-dark');
            timerDisplay.classList.add('text-danger');
            showAlert('⚠️ ใกล้หมดรอบเวลาแล้ว! กรุณาบันทึกงานและเตรียมตัวเลิกใช้งาน');
            if (diff < 60 * 1000) {
                timerDisplay.style.opacity = (new Date().getMilliseconds() < 500) ? '1' : '0.5';
            }
        } else {
            timerDisplay.classList.remove('text-danger');
            timerDisplay.classList.add('text-dark');
            timerDisplay.style.opacity = '1';
            hideAlert();
        }
    }
}

function syncWithAdminUpdates() {
    const session = DB.getSession(); 
    if (!session || !session.pcId) return;

    const pcs = DB.getPCs();
    const pc = pcs.find(p => String(p.id) === String(session.pcId));

    if (pc) {
        if (pc.status !== 'in_use' || pc.currentUser !== session.user.name) {
            alert("⚠️ Admin ได้ทำการรีเซ็ตเครื่องหรือเช็คเอาท์ให้คุณแล้ว");
            DB.clearSession();
            window.location.href = 'index.html';
            return;
        }

        const dbForceTime = pc.forceEndTime;
        const localForceTime = session.forceEndTime;

        if (dbForceTime !== localForceTime) {
            console.log(`🔄 Time Updated! DB: ${dbForceTime}, Local: ${localForceTime}`);
            session.forceEndTime = dbForceTime;
            DB.setSession(session);

            if (dbForceTime) {
                setupCountdownMode(session);
            } else {
                setupUnlimitedMode();
            }
            hideAlert();
        }
    }
}

function handleTimeUp() {
    alert("⏰ หมดเวลาการใช้งานในรอบนี้แล้ว\nระบบจะทำการ Check-out โดยอัตโนมัติ");
    doCheckout(true);
}

function formatTime(ms) {
    const h = Math.floor(ms / 3600000).toString().padStart(2, '0');
    const m = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function showAlert(msg) {
    const box = document.getElementById('alertBox');
    const txt = document.getElementById('alertMsg');
    if(box && txt) {
        box.classList.remove('d-none');
        txt.innerText = msg;
    }
}

function hideAlert() {
    const box = document.getElementById('alertBox');
    if(box) box.classList.add('d-none');
}

function doCheckout(isAuto = false) {
    if (!isAuto && !confirm('คุณต้องการเลิกใช้งานและออกจากระบบใช่หรือไม่?')) return;
    if (timerInterval) clearInterval(timerInterval);

    const session = DB.getSession();
    if (!session) { window.location.href = 'index.html'; return; }

    const endTime = Date.now();
    const durationMilliseconds = endTime - session.startTime;
    const durationMinutes = Math.round(durationMilliseconds / 60000); 

    DB.updatePCStatus(session.pcId, 'available', null);

    session.durationMinutes = durationMinutes; 
    DB.setSession(session);
    
    window.location.href = 'feedback.html';
}