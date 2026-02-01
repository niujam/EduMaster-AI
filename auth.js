// ===================================
// Firebase Initialization
// ===================================
firebase.initializeApp(window.CONFIG.firebase);
const auth = firebase.auth();
const db = firebase.firestore();

// Make db globally accessible
window.db = db;
window.firebase = firebase;

// ===================================
// DOM Elements - Auth
// ===================================
const authGate = document.getElementById('authGate');
const dashboard = document.getElementById('dashboard');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');

const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn = document.getElementById('showLogin');
const showResetBtn = document.getElementById('showReset');
const backToLoginBtn = document.getElementById('backToLogin');

// ===================================
// Form Switching
// ===================================
function switchForm(hideForm, showForm) {
    hideForm.classList.remove('active');
    setTimeout(() => {
        showForm.classList.add('active');
    }, 200);
}

showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, registerForm);
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(registerForm, loginForm);
});

showResetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(loginForm, resetForm);
});

backToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(resetForm, loginForm);
});

// ===================================
// Login Handler
// ===================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        showLoading(true);
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Kyçja u krye me sukses!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        let message = 'Gabim gjatë kyçjes. Provoni përsëri.';
        
        if (error.code === 'auth/user-not-found') {
            message = 'Ky përdorues nuk ekziston.';
        } else if (error.code === 'auth/wrong-password') {
            message = 'Fjalëkalimi është i gabuar.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Email-i nuk është valid.';
        }
        
        showToast(message, 'error');
    } finally {
        showLoading(false);
    }
});

// ===================================
// Register Handler
// ===================================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    if (password.length < 6) {
        showToast('Fjalëkalimi duhet të ketë të paktën 6 karaktere.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        // Create user account
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile with name
        await user.updateProfile({
            displayName: name
        });
        
        // Create user document in Firestore with free credits
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            credits: window.CONFIG.credits.free,
            totalGenerated: 0,
            totalDownloads: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Llogaria u krijua me sukses! Morët ${window.CONFIG.credits.free} kredite falas.`, 'success');
        
    } catch (error) {
        console.error('Register error:', error);
        let message = 'Gabim gjatë regjistrimit. Provoni përsëri.';
        
        if (error.code === 'auth/email-already-in-use') {
            message = 'Ky email është tashmë në përdorim.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Email-i nuk është valid.';
        } else if (error.code === 'auth/weak-password') {
            message = 'Fjalëkalimi është shumë i dobët.';
        }
        
        showToast(message, 'error');
    } finally {
        showLoading(false);
    }
});

// ===================================
// Reset Password Handler
// ===================================
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();
    
    try {
        showLoading(true);
        await auth.sendPasswordResetEmail(email);
        showToast('Linku për rivendosjen e fjalëkalimit u dërgua në email.', 'success');
        
        // Switch back to login form
        setTimeout(() => {
            switchForm(resetForm, loginForm);
            resetForm.reset();
        }, 2000);
        
    } catch (error) {
        console.error('Reset error:', error);
        let message = 'Gabim gjatë dërgimit të email-it.';
        
        if (error.code === 'auth/user-not-found') {
            message = 'Nuk ekziston përdorues me këtë email.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Email-i nuk është valid.';
        }
        
        showToast(message, 'error');
    } finally {
        showLoading(false);
    }
});

// ===================================
// Auth State Observer
// ===================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        authGate.style.display = 'none';
        dashboard.style.display = 'flex';
        
        // Update last login
        try {
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating last login:', error);
        }
        
        // Initialize app (implemented in app.js)
        if (typeof initializeApp === 'function') {
            initializeApp(user);
        }
        
    } else {
        // User is signed out
        authGate.style.display = 'flex';
        dashboard.style.display = 'none';
    }
});

// ===================================
// Logout Handler (Referenced in app.js)
// ===================================
function logout() {
    auth.signOut()
        .then(() => {
            showToast('U shkëputët me sukses.', 'success');
            // Reset forms
            loginForm.reset();
            registerForm.reset();
            resetForm.reset();
            switchForm(registerForm, loginForm);
        })
        .catch((error) => {
            console.error('Logout error:', error);
            showToast('Gabim gjatë shkëputjes.', 'error');
        });
}

// ===================================
// Utility Functions
// ===================================
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}