// admin-logic.js
import { db, ref, set, onValue, push, remove, update, get } from './firebase-config.js';

// Admin State
window.isAdmin = false;
window.dbPasswords = { main: "adcrjylab@123", vault: "admin@123" };
let clickCount = 0;

// Export DB tools for the main app
window.firebaseDB = { db, dbRef: ref(db, 'lab_keys'), backupRef: ref(db, 'backups'), set, onValue, push, remove, update, ref, get };

// Listen for password changes from DB
onValue(ref(db, 'passwords'), (ps) => { 
    if(ps.exists()) window.dbPasswords = ps.val(); 
});

// Admin Login Trigger
window.handleAdminTrigger = () => {
    clickCount++;
    if(clickCount === 5) {
        if(prompt("Password:") === window.dbPasswords.main) {
            window.isAdmin = true;
            document.getElementById('admin-main-tools').style.display = 'block';
            window.showMsg("Logged in as Admin");
            window.render(); // Re-render to show admin buttons
        }
        clickCount = 0;
    }
};

window.openSecureData = () => {
    if(prompt("2nd Step Password:") === window.dbPasswords.vault) {
        document.getElementById('secure-modal').style.display = 'block';
        window.loadBackups();
    } else alert("Wrong Password!");
};

window.createBackup = async () => {
    await push(window.firebaseDB.backupRef, { 
        date: new Date().toLocaleString(), 
        snapshot: window.currentData 
    });
    window.showMsg("Backup Saved!");
};

window.loadBackups = () => {
    const listDiv = document.getElementById('backup-list');
    onValue(window.firebaseDB.backupRef, (snapshot) => {
        const backups = snapshot.val();
        listDiv.innerHTML = "";
        if(!backups) return listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>";
        Object.keys(backups).reverse().forEach(id => {
            const b = backups[id];
            const div = document.createElement('div');
            div.className = 'backup-item';
            div.innerHTML = `
                <div style="font-size:12px; font-weight:bold;">${b.date}</div>
                <div style="display:flex; gap:5px;">
                    <button class="mini-btn edit-btn" onclick="restoreBackup('${id}')">RETAKE</button>
                    <button class="mini-btn del-btn" onclick="deleteBackup('${id}')">×</button>
                </div>`;
            listDiv.appendChild(div);
        });
    });
};

window.restoreBackup = async (id) => {
    if(confirm("Overwrite current live data?")) {
        const snap = await get(ref(db, 'backups/' + id + '/snapshot'));
        if(snap.exists()) { 
            await set(ref(db, 'lab_keys'), snap.val()); 
            window.showMsg("Restored!"); 
        }
    }
};

window.deleteBackup = async (id) => {
    if(confirm("Delete backup?")) await remove(ref(db, 'backups/' + id));
};
