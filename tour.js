// ===================================
// User Onboarding Tour with Driver.js
// ===================================

let driverInstance = null;

/**
 * Initiate the onboarding tour
 */
function startUserTour() {
    // Check if Driver is available
    if (typeof Driver === 'undefined') {
        console.warn('Driver.js not loaded');
        return;
    }

    driverInstance = new Driver({
        onDestroyed: () => {
            console.log('Tour completed or closed');
        },
        allowClose: true,
        overlayOpacity: 0.4,
        smoothScroll: true,
        doneBtnText: 'Përfundo',
        closeBtnText: '✕',
        nextBtnText: 'Tjetër',
        prevBtnText: 'Mbrapa',
        stageBackground: '#ffffff',
    });

    // Define tour steps
    const steps = [
        {
            element: '[data-page="home"]',
            popover: {
                title: 'Mirëseardhja në EduMaster AI! 🎓',
                description: 'Këtu shohni statistikat e punës tuaj: ditarët e gjeneruar, kreditet e disponueshme dhe shkarkesat. Kjo është qendra juaj e kontrollit!',
                side: 'right',
                align: 'start',
            }
        },
        {
            element: '.sidebar-toggle',
            popover: {
                title: 'Toggle Sidebar 📱',
                description: 'Klikoni këtë buton për të mbyllur ose hapur Sidebar-in. Kur e mbyllni, ditari merr 100% të ekranit për një pamje më të qartë dhe profesionale!',
                side: 'right',
                align: 'center',
            }
        },
        {
            element: '[data-page="generate"]',
            popover: {
                title: 'Gjenerimi i Ditarëve ✨',
                description: 'Klikim këtu për të filluar "magjinë". Plotësoni të dhënat e orës dhe AI do të krijon ditarin për ju në pak sekonda.',
                side: 'right',
                align: 'center',
            }
        },
        {
            element: '#themeToggle',
            popover: {
                title: 'Tema e Faqes 🌙',
                description: 'Ndryshoni ndërmjet temës së errët dhe të ndritshme për të mbrojtur sytë tuaj gjatë punës së zgjatur.',
                side: 'bottom',
                align: 'center',
            }
        },
        {
            element: '[data-page="buyCredits"]',
            popover: {
                title: 'Blej Kredite 💳',
                description: 'Kur t\'u mbarojnë kreditet, këtu mund t\'i blejnë më shumë. Ofrojmë paketa të ndryshme për çdo buxhet.',
                side: 'right',
                align: 'center',
            }
        },
        {
            element: '[data-page="profile"]',
            popover: {
                title: 'Profili Juaj 👤',
                description: 'Menaxhoni profilin, ndryshoni fjalëkalimin dhe përditësoni të dhënat e llogarisë.',
                side: 'right',
                align: 'center',
            }
        },
        {
            element: '[data-page="settings"]',
            popover: {
                title: 'Cilësimet ⚙️',
                description: 'Këtu gjeni ndihmen, kontaktin për mbështetje dhe dokumentacionin ligjor (Privacy, Terms).',
                side: 'right',
                align: 'center',
            }
        },
        {
            element: '.top-bar',
            popover: {
                title: 'Jeni Gati! 🎉',
                description: 'Tani jeni i/e gatshëm/gatshme të filloni. Si shërbim mirëpritjeje, marr 5 kredite FALAS!',
                side: 'bottom',
                align: 'center',
                onNextClick: showWelcomeBonus,
            }
        }
    ];

    // Define steps
    driverInstance.defineSteps(steps);
    
    // Start the tour
    driverInstance.start();

    // Allow skipping by pressing Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            driverInstance.destroy();
        }
    });
}

/**
 * Show welcome bonus modal with confetti
 */
function showWelcomeBonus() {
    // Close driver first
    if (driverInstance) {
        driverInstance.destroy();
    }

    // Check if user already redeemed bonus to prevent double-claiming
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    firebase.firestore().collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists && doc.data().bonusCreditsRedeemed === true) {
            console.log('Bonus already redeemed for this user');
            return;
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'welcomeBonusOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'welcomeBonusModal';
        modal.style.cssText = `
            position: relative;
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
            border-radius: 24px;
            padding: 50px 40px;
            text-align: center;
            max-width: 550px;
            width: 90%;
            box-shadow: 0 30px 80px rgba(0,0,0,0.3), 0 0 40px rgba(16, 163, 127, 0.2);
            animation: slideInFromTop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 2px solid rgba(16, 163, 127, 0.3);
        `;

        modal.innerHTML = `
            <div style="position: relative;">
                <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 2s infinite;">🎉</div>
                <h2 style="color: #10a37f; font-size: 36px; margin: 20px 0; font-weight: 700;">
                    Mirëseerdhët në EduMaster AI! 🎉
                </h2>
                <p style="color: #555; font-size: 18px; margin-bottom: 30px; line-height: 1.6;">
                    Për t'ju ndihmuar në fillimin tuaj, kemi përgatitur një dhuratë spesiale:
                </p>
                <div style="
                    background: linear-gradient(135deg, #10a37f 0%, #0d8c6a 100%);
                    border-radius: 16px;
                    padding: 30px;
                    margin-bottom: 35px;
                    box-shadow: 0 10px 30px rgba(16, 163, 127, 0.3);
                    transform: scale(1);
                    animation: pulse 2s infinite;
                ">
                    <p style="color: white; font-size: 16px; margin: 0 0 10px 0;">5 Kredite Falas</p>
                    <p style="color: white; font-size: 48px; font-weight: 900; margin: 0;">🎁</p>
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 10px 0 0 0;">Për të gjeneruar ditarët tuaj të parë</p>
                </div>
                <button id="acceptBonusBtn" style="
                    background: #10a37f;
                    color: white;
                    border: none;
                    padding: 16px 50px;
                    border-radius: 12px;
                    font-size: 18px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 10px 30px rgba(16, 163, 127, 0.3);
                    position: relative;
                    overflow: hidden;
                ">
                    <span style="position: relative; z-index: 1;">Prano Dhuratën 🎁</span>
                    <style>
                        #acceptBonusBtn:hover {
                            background: #0d8c6a;
                            transform: translateY(-3px);
                            box-shadow: 0 15px 40px rgba(16, 163, 127, 0.4);
                        }
                        #acceptBonusBtn:active {
                            transform: translateY(-1px);
                        }
                    </style>
                </button>
            </div>

            <style>
                @keyframes slideInFromTop {
                    0% { 
                        transform: translateY(-60px) scale(0.8);
                        opacity: 0;
                    }
                    100% { 
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            </style>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Trigger confetti
        if (typeof confetti !== 'undefined') {
            setTimeout(() => {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.3 },
                    colors: ['#10a37f', '#0d8c6a', '#ffd700', '#ff6b6b', '#4f46e5']
                });
            }, 300);
        }

        // Handle bonus acceptance
        document.getElementById('acceptBonusBtn').addEventListener('click', async () => {
            try {
                const acceptBtn = document.getElementById('acceptBonusBtn');
                acceptBtn.disabled = true;
                acceptBtn.style.opacity = '0.6';
                acceptBtn.textContent = 'Po përpunohet...';

                // Get current user
                const currentUser = firebase.auth().currentUser;
                if (!currentUser) return;

                // Check again if bonus already redeemed (prevent race conditions)
                const userDocCheck = await firebase.firestore().collection('users').doc(currentUser.uid).get();
                if (userDocCheck.exists && userDocCheck.data().bonusCreditsRedeemed === true) {
                    showToast('Ky bonus është përdorur tashmë.', 'warning');
                    overlay.remove();
                    return;
                }

                // Add 5 credits to Firestore
                const db = firebase.firestore();
                const userRef = db.collection('users').doc(currentUser.uid);
                
                await userRef.update({
                    credits: firebase.firestore.FieldValue.increment(5),
                    isFirstTime: false,
                    tourCompleted: true,
                    bonusCreditsRedeemed: true
                });

                // Trigger final confetti burst
                if (typeof confetti !== 'undefined') {
                    confetti({
                        particleCount: 200,
                        spread: 150,
                        origin: { y: 0.4 },
                        colors: ['#10a37f', '#0d8c6a', '#ffd700']
                    });
                }

                // Show success message
                showToast('✅ Kreditet u shtuan me sukses!', 'success');

                // Remove overlay
                setTimeout(() => {
                    overlay.remove();
                    // Refresh page to update credits display
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                }, 800);

            } catch (error) {
                console.error('Error accepting bonus:', error);
                showToast('Pati një gabim. Ju lutem provoni përsëri.', 'error');
                document.getElementById('acceptBonusBtn').disabled = false;
                document.getElementById('acceptBonusBtn').style.opacity = '1';
                document.getElementById('acceptBonusBtn').textContent = 'Prano Dhuratën 🎁';
            }
        });
    }).catch((error) => {
        console.error('Error checking bonus status:', error);
    });
}

/**
 * Check if tour should run on app load
 */
function checkAndStartTour() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    // Check if user has already completed tour
    firebase.firestore().collection('users').doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            // Start tour only if isFirstTime is true or tourCompleted is false
            if (userData.isFirstTime === true || !userData.tourCompleted) {
                // Small delay to ensure UI is ready
                setTimeout(() => {
                    startUserTour();
                }, 1000);
            }
        }
    }).catch((error) => {
        console.error('Error checking tour status:', error);
    });
}

// Export functions
window.startUserTour = startUserTour;
window.checkAndStartTour = checkAndStartTour;
