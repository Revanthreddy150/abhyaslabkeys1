// admin-logic.js
import { db, ref, set, onValue, push, remove, update, get } from './firebase-config.js';

// Admin State - Should be toggled to true by your admin.html script upon successful login
window.isAdmin = false;

// Export DB tools for the main app
window.firebaseDB = { 
    db, 
    dbRef: ref(db, 'lab_keys'), 
    backupRef: ref(db, 'backups'), 
    set, 
    onValue, 
    push, 
    remove, 
    update, 
    ref, 
    get 
};

/**
 * SECURE DATA ACCESS
 * Called from admin.html or a "Secure" button.
 * Since passwords are handled externally, this just opens the modal.
 */
window.openSecureData = () => {
    if (window.isAdmin) {
        const modal = document.getElementById('secure-modal');
        if (modal) {
            modal.style.display = 'block';
            window.loadBackups();
        }
    } else {
        alert("Access Denied: Please login via Admin Panel.");
    }
};

/**
 * BACKUP MANAGEMENT
 */
window.createBackup = async () => {
    if (!window.isAdmin) return;
    
    try {
        await push(window.firebaseDB.backupRef, { 
            date: new Date().toLocaleString(), 
            snapshot: window.currentData 
        });
        window.showMsg("Backup Saved!");
    } catch (error) {
        console.error("Backup failed:", error);
        window.showMsg("Backup Error", "red");
    }
};

window.loadBackups = () => {
    if (!window.isAdmin) return;

    const listDiv = document.getElementById('backup-list');
    if (!listDiv) return;

    onValue(window.firebaseDB.backupRef, (snapshot) => {
        const backups = snapshot.val();
        listDiv.innerHTML = "";
        
        if (!backups) {
            listDiv.innerHTML = "<p style='text-align:center'>No backups found.</p>";
            return;
        }

        Object.keys(backups).reverse().forEach(id => {
            const b = backups[id];
            const div = document.createElement('div');
            div.className = 'backup-item';
            div.innerHTML = `
                <div style="font-size:12px; font-weight:bold;">${b.date}</div>
                <div style="display:flex; gap:5px;">
                    <button class="mini-btn edit-btn" onclick="restoreBackup('${id}')">RESTORE</button>
                    <button class="mini-btn del-btn" onclick="deleteBackup('${id}')">×</button>
                </div>`;
            listDiv.appendChild(div);
        });
    });
};

window.restoreBackup = async (id) => {
    if (!window.isAdmin) return;

    if (confirm("Overwrite current live data with this backup?")) {
        const snap = await get(ref(db, `backups/${id}/snapshot`));
        if (snap.exists()) { 
            await set(ref(db, 'lab_keys'), snap.val()); 
            window.showMsg("Data Restored!"); 
            if (window.render) window.render();
        }
    }
};

window.deleteBackup = async (id) => {
    if (!window.isAdmin) return;
    if (confirm("Delete this backup permanently?")) {
        await remove(ref(db, 'backups/' + id));
    }
};
