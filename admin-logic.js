import { db, ref, set, onValue, push, remove, update, get } from './firebase-config.js';

// Check if the user is already logged in via localStorage
window.isAdmin = localStorage.getItem('isLabAdmin') === 'true';

// Global Firebase helper object
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
 * 2nd STEP SECURE ACCESS
 * Asks for the vault password stored in Firebase
 */
window.openSecureData = async () => {
    if (!window.isAdmin) {
        alert("Admin access required.");
        return;
    }

    try {
        // Fetch the Vault password from the 'passwords' node
        const snap = await get(ref(db, 'passwords/vault'));
        const vaultPass = snap.val();
        
        if (!vaultPass) {
            alert("Vault password not set in Admin Panel!");
            return;
        }

        const input = prompt("Enter 2nd Step Vault Password:");
        if (input === vaultPass) {
            document.getElementById('secure-modal').style.display = 'block';
            window.loadBackups();
        } else if (input !== null) {
            alert("Incorrect Vault Password!");
        }
    } catch (error) {
        console.error("Auth error:", error);
        alert("Error connecting to security vault.");
    }
};

/**
 * BACKUP SYSTEM
 * Saves a full snapshot of 'lab_keys' into the 'backups' node
 */
window.createBackup = async () => {
    if (!window.isAdmin) return;
    
    try {
        // Ensure we have data to back up
        if (!window.currentData || Object.keys(window.currentData).length === 0) {
            alert("No data found to backup!");
            return;
        }

        await push(window.firebaseDB.backupRef, { 
            date: new Date().toLocaleString(), 
            snapshot: window.currentData 
        });
        window.showMsg("Backup Saved Successfully!");
    } catch (e) { 
        console.error(e);
        window.showMsg("Backup Error!"); 
    }
};

/**
 * LIST BACKUPS
 * Listens to the backup node and renders the list in the modal
 */
window.loadBackups = () => {
    onValue(window.firebaseDB.backupRef, (snapshot) => {
        const backups = snapshot.val();
        const listDiv = document.getElementById('backup-list');
        
        if (!listDiv) return;
        listDiv.innerHTML = "";

        if (!backups) {
            listDiv.innerHTML = "<p style='text-align:center; color:gray;'>No backups available.</p>";
            return;
        }

        // Show backups from newest to oldest
        Object.keys(backups).reverse().forEach(id => {
            const data = backups[id];
            const div = document.createElement('div');
            div.className = 'backup-item';
            div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee;";
            
            div.innerHTML = `
                <div style="font-size:12px;">
                    <strong>${data.date}</strong>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="mini-btn edit-btn" onclick="restoreBackup('${id}')">RESTORE</button>
                    <button class="mini-btn del-btn" onclick="deleteBackup('${id}')" style="background:#fee2e2; color:red; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">×</button>
                </div>
            `;
            listDiv.appendChild(div);
        });
    });
};

/**
 * RESTORE DATA
 * Overwrites current 'lab_keys' with the selected backup snapshot
 */
window.restoreBackup = async (id) => {
    if (!window.isAdmin) return;

    if (confirm("WARNING: This will overwrite all current lab keys with this backup. Continue?")) {
        try {
            const snap = await get(ref(db, `backups/${id}/snapshot`));
            if (snap.exists()) {
                await set(ref(db, 'lab_keys'), snap.val());
                window.showMsg("Repository Restored!");
                // Modal closes automatically or stays open for user to see
            } else {
                alert("Backup data no longer exists.");
            }
        } catch (error) {
            console.error(error);
            alert("Restore failed.");
        }
    }
};

/**
 * DELETE BACKUP
 * Removes a specific backup entry from Firebase
 */
window.deleteBackup = async (id) => {
    if (!window.isAdmin) return;

    if (confirm("Delete this backup permanently?")) {
        try {
            await remove(ref(db, `backups/${id}`));
            window.showMsg("Backup Deleted");
        } catch (error) {
            alert("Delete failed.");
        }
    }
};
