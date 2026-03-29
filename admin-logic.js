import { db, ref, set, onValue, push, remove, update, get } from './firebase-config.js';

// --- INITIAL STATE & CONFIG ---
window.isAdmin = false;
window.dbPasswords = { main: "adcrjylab@123", vault: "admin@123" };
let clickCount = 0;

// Export DB tools
window.firebaseDB = { db, dbRef: ref(db, 'lab_keys'), backupRef: ref(db, 'backups'), set, onValue, push, remove, update, ref, get };

// --- STYLING (Add this to your CSS file or a <style> tag) ---
const style = document.createElement('style');
style.innerHTML = `
    .card {
        position: relative; /* Essential for the image positioning */
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 15px;
        padding: 20px;
        width: 350px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        font-family: sans-serif;
    }
    .card-image {
        position: absolute;
        top: 15px;
        right: 15px;
        width: 80px;  /* Adjust size as needed */
        height: 80px;
        border-radius: 50%; /* Makes it circular like your drawing area */
        object-fit: cover;
        border: 2px solid #f0f0f0;
        display: block;
    }
    .card-title { font-size: 1.2rem; margin: 0 0 10px 0; color: #333; }
    .view-repo { color: #00a884; font-weight: bold; text-decoration: none; font-size: 0.9rem; cursor: pointer; }
    .btn-group { display: flex; gap: 10px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; }
    .btn { flex: 1; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .edit-btn { background: #e3f2fd; color: #1976d2; }
    .del-btn { background: #ffebee; color: #c62828; }
`;
document.head.appendChild(style);

// --- CORE LOGIC ---

// Listen for password changes
onValue(ref(db, 'passwords'), (ps) => { 
    if(ps.exists()) window.dbPasswords = ps.val(); 
});

// Admin Login Trigger (Click title 5 times)
window.handleAdminTrigger = () => {
    clickCount++;
    if(clickCount === 5) {
        if(prompt("Password:") === window.dbPasswords.main) {
            window.isAdmin = true;
            const tools = document.getElementById('admin-main-tools');
            if(tools) tools.style.display = 'block';
            window.showMsg("Logged in as Admin");
            window.render(); 
        }
        clickCount = 0;
    }
};

// Function to Render the Card with the Image
window.render = () => {
    const container = document.getElementById('app-container');
    onValue(window.firebaseDB.dbRef, (snapshot) => {
        const data = snapshot.val();
        if(!data) return;

        container.innerHTML = `
            <div class="card">
                ${data.imageUrl ? `<img src="${data.imageUrl}" class="card-image" alt="Repo Icon">` : ''}
                
                <h2 class="card-title" onclick="handleAdminTrigger()">${data.title || 'Python Lo Functionss'}</h2>
                <div class="view-repo">VIEW REPOSITORY</div>
                
                ${window.isAdmin ? `
                    <div class="btn-group">
                        <button class="btn edit-btn" onclick="editCard()">Edit</button>
                        <button class="btn del-btn" onclick="deleteCard()">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
};

// Admin Edit: Includes Image URL prompt
window.editCard = async () => {
    const newTitle = prompt("New Title:");
    const newImg = prompt("New Image URL:");
    if(newTitle || newImg) {
        await update(window.firebaseDB.dbRef, { 
            title: newTitle || "Python Lo Functionss", 
            imageUrl: newImg 
        });
        window.showMsg("Updated!");
    }
};

// Backup Logic
window.createBackup = async () => {
    const currentSnap = await get(window.firebaseDB.dbRef);
    await push(window.firebaseDB.backupRef, { 
        date: new Date().toLocaleString(), 
        snapshot: currentSnap.val() 
    });
    window.showMsg("Backup Saved!");
};

window.restoreBackup = async (id) => {
    if(confirm("Overwrite current live data?")) {
        const snap = await get(ref(db, 'backups/' + id + '/snapshot'));
        if(snap.exists()) { 
            await set(window.firebaseDB.dbRef, snap.val()); 
            window.showMsg("Restored!"); 
        }
    }
};

// Utility
window.showMsg = (msg) => alert(msg);

// Initialize
window.render();
