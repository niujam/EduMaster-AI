// ===================================
// Global Variables
// ===================================
let currentUser = null;
let userCredits = 0;
let userHistory = [];
let modelPhoto = null; // Foto model (vetem 1)
let contentPhotos = []; // Fotot e librit (deri ne 10)
const MODEL_FALLBACK_PATH = 'model-matematike.jpg';
let cachedFallbackModelBase64 = null;

// ===================================
// DOM Elements - Navigation
// ===================================
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const backBtn = document.getElementById('backBtn');
const logoutBtn = document.getElementById('logoutBtn');
const mainContent = document.querySelector('.main-content');

// ===================================
// DOM Elements - Theme
// ===================================
const themeToggle = document.getElementById('themeToggle');

// ===================================
// DOM Elements - Generate Form
// ===================================
const generateForm = document.getElementById('generateForm');
const generateBtn = document.getElementById('generateBtn');
const generationResult = document.getElementById('generationResult');
const generatedContent = document.getElementById('generatedContent');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');

// ===================================
// DOM Elements - Photo Upload
// ===================================
const modelPhotoInput = document.getElementById('modelPhotoInput');
const uploadModelBtn = document.getElementById('uploadModelBtn');
const modelPhotoPreview = document.getElementById('modelPhotoPreview');
const modelPhotoStatus = document.getElementById('modelPhotoStatus');
const contentPhotosInput = document.getElementById('contentPhotosInput');
const uploadContentBtn = document.getElementById('uploadContentBtn');
const contentPhotoPreview = document.getElementById('contentPhotoPreview');
const contentPhotoCount = document.getElementById('contentPhotoCount');
const multipleThemesCheckbox = document.getElementById('multipleThemesCheckbox');

// ===================================
// DOM Elements - Credits Display
// ===================================
const creditsCount = document.getElementById('creditsCount');
const creditsDisplay = document.getElementById('creditsDisplay');
const profileCredits = document.getElementById('profileCredits') || creditsDisplay;

// Safety check for critical elements
if (!creditsCount || !creditsDisplay) {
    console.warn('⚠️ Credit display elements are missing');
}

// ===================================
// Credits Display
// ===================================
function updateCreditsDisplay(credits) {
    if (creditsCount) creditsCount.textContent = credits;
    if (creditsDisplay) creditsDisplay.textContent = credits;
    if (profileCredits) profileCredits.textContent = credits;
}

function getDb() {
    return window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
}

// ===================================
// Load User Data
// ===================================
async function loadUserData() {
    if (!currentUser) {
        console.warn('No user logged in, skipping data load');
        return;
    }

    try {
        const dbRef = getDb();
        if (!dbRef) {
            console.warn('Firestore not available, cannot load credits');
            return;
        }

        const userDoc = await dbRef.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            userCredits = userData.credits || 0;
            updateCreditsDisplay(userCredits);
        } else {
            userCredits = 0;
            updateCreditsDisplay(userCredits);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// ===================================
// Setup Realtime Listeners
// ===================================
function setupRealtimeListeners() {
    if (!currentUser) return;
    const dbRef = getDb();
    if (!dbRef) {
        console.warn('Firestore not available, cannot subscribe to credits');
        return;
    }

    dbRef.collection('users').doc(currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                userCredits = userData.credits || 0;
                updateCreditsDisplay(userCredits);
            }
        });
}

// ===================================
// Initialize App (called from auth.js)
// ===================================
function initializeApp(user) {
    currentUser = user;
    loadUserData();
    setupRealtimeListeners();
}

// Make remove helpers global
window.removeModelPhoto = removeModelPhoto;
window.removeContentPhoto = removeContentPhoto;


// ===================================
// Add Credits (DEBUG/ADMIN)
// ===================================
async function addCredits(amount) {
    if (!currentUser) {
        console.warn('No user logged in');
        return;
    }
    try {
        await window.db.collection('users').doc(currentUser.uid).update({
            credits: window.firebase.firestore.FieldValue.increment(amount)
        });
        await loadUserData();
        showToast(`${amount} kredite u shtuan me sukses!`, 'success');
        console.log(`Added ${amount} credits`);
    } catch (e) {
        console.error('Error adding credits:', e);
        showToast('Gabim në shtimin e krediteve', 'error');
    }
}

// Make it available in console for testing
window.addCredits = addCredits;

// ===================================
// Sidebar Toggle Button
// ===================================
const sidebarToggle = document.querySelector('.sidebar-toggle') || createSidebarToggle();

function createSidebarToggle() {
    const toggle = document.createElement('button');
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = '☰';
    toggle.type = 'button';
    toggle.addEventListener('click', toggleSidebar);
    toggle.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleSidebar();
    }, { passive: false });
    document.body.appendChild(toggle);
    return toggle;
}

function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        const isActive = sidebar.classList.contains('active') || sidebar.classList.contains('visible');
        if (isActive) {
            sidebar.classList.remove('active', 'visible');
            sidebar.classList.add('closed');
        } else {
            sidebar.classList.add('active', 'visible');
            sidebar.classList.remove('closed');
        }
    } else {
        sidebar.classList.toggle('closed');
        mainContent.classList.toggle('full-width');
    }

    const isClosed = sidebar.classList.contains('closed');
    localStorage.setItem('sidebarClosed', isClosed);

    const toggleButtons = document.querySelectorAll('.sidebar-toggle');
    toggleButtons.forEach(btn => {
        btn.innerHTML = isClosed ? '→' : '☰';
        btn.title = isClosed ? 'Hap Sidebar-in' : 'Mbyll Sidebar-in';
        btn.style.display = 'block !important';
        btn.style.zIndex = '9999 !important';
    });

    console.log('Sidebar toggled:', isClosed ? 'closed' : 'open', '(Mobile:', isMobile, ')');
}

// Auto-close sidebar when clicking nav items (all devices)
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const page = item.getAttribute('data-page');
        if (page) {
            navigateToPage(page);
        }

        if (!sidebar.classList.contains('closed')) {
            sidebar.classList.add('closed');
            mainContent.classList.add('full-width');
            localStorage.setItem('sidebarClosed', 'true');

            const toggleButtons = document.querySelectorAll('.sidebar-toggle');
            toggleButtons.forEach(btn => {
                btn.innerHTML = '→';
                btn.title = 'Hap Sidebar-in';
            });
        }

        sidebar.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
    });
});

// ===================================
// Page Navigation
// ===================================
function navigateToPage(pageName) {
    const targetPage = document.getElementById(`${pageName}Page`);
    if (!targetPage) {
        console.error(`Page not found: ${pageName}Page`);
        return;
    }

    pages.forEach(page => {
        page.style.display = 'none';
    });
    targetPage.style.display = 'block';

    targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });

    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageName);
    });

    if (pageName === 'home') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
    }
}

backBtn.addEventListener('click', () => {
    navigateToPage('home');
});

// ===================================
// Buy Credits Button (Sidebar)
// ===================================
const buyCreditsNavBtn = document.getElementById('buyCreditsNavBtn');
if (buyCreditsNavBtn) {
    buyCreditsNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage('buyCredits');
    });
}

// ===================================
// Sidebar Toggle - Universal (PC & Mobile)
// ===================================
if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    toggleSidebarBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleSidebar();
    }, { passive: false });
}

if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleSidebar();
    }, { passive: false });
}

// Restore sidebar state on load
window.addEventListener('load', () => {
    const sidebarClosed = localStorage.getItem('sidebarClosed') === 'true';
    if (sidebarClosed) {
        sidebar.classList.add('closed');
        mainContent.classList.add('full-width');
        const toggleButtons = document.querySelectorAll('.sidebar-toggle');
        toggleButtons.forEach(btn => {
            btn.innerHTML = '→';
            btn.title = 'Hap Sidebar-in';
        });
    }
});

// ===================================
// Theme Toggle
// ===================================
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    
    themeToggle.innerHTML = isLight 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
    
    // Save preference
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

// ===================================
// Quick Actions
// ===================================
document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;
        navigateToPage(action);
    });
});

// ===================================
// Photo Optimization with Canvas
// ===================================
/**
 * Optimizoni foton duke e zvogëluar në Canvas
 * dhe duke e konvertuar në Base64 me cilësi 0.9
 * 
 * @param {File} file - Skedar imazh i ngarkuar
 * @returns {Promise<string>} - Base64 string i fotos të optimizuar
 */
function optoFoto(file) {
    return new Promise((resolve, reject) => {
        // Krijo FileReader
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                // Krijo Canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Llogarit dimensionet e reja (max 1200px)
                let newWidth = img.width;
                let newHeight = img.height;
                const maxSize = 1200;
                
                if (img.width > img.height) {
                    // Imazhi është në horizontal
                    if (img.width > maxSize) {
                        newWidth = maxSize;
                        newHeight = Math.round((img.height * maxSize) / img.width);
                    }
                } else {
                    // Imazhi është në vertikal ose katror
                    if (img.height > maxSize) {
                        newHeight = maxSize;
                        newWidth = Math.round((img.width * maxSize) / img.height);
                    }
                }
                
                // Vendos canvas dimensionet
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // Vizato imazhin në canvas
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Konverto në Base64 JPEG me cilësi 0.9 për qartësi të lartë
                const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                
                // Llogarit madhësine origjinale vs të optimizuar
                const originalSize = (event.target.result.length / 1024).toFixed(2);
                const optimizedSize = (optimizedBase64.length / 1024).toFixed(2);
                
                console.log(`📸 Foto optimizuar: ${file.name}`);
                console.log(`   Original: ${originalSize}KB (${img.width}x${img.height}px)`);
                console.log(`   Optimized: ${optimizedSize}KB (${newWidth}x${newHeight}px)`);
                console.log(`   Kompresim: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}%`);
                
                resolve(optimizedBase64);
            };
            
            img.onerror = () => {
                reject(new Error('Gabim në ngarkimin e imazhit'));
            };
            
            // Vendos source në Image
            img.src = event.target.result;
        };
        
        reader.onerror = () => {
            reject(new Error('Gabim në leximin e skedarit'));
        };
        
        // Lexo skedarit si Data URL
        reader.readAsDataURL(file);
    });
}

function estimateBase64Bytes(base64) {
    const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
    return Math.ceil((cleaned.length * 3) / 4);
}

function optimizeBase64Image(base64, maxSize = 1200, quality = 0.9) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let newWidth = img.width;
            let newHeight = img.height;

            if (img.width > img.height) {
                if (img.width > maxSize) {
                    newWidth = maxSize;
                    newHeight = Math.round((img.height * maxSize) / img.width);
                }
            } else {
                if (img.height > maxSize) {
                    newHeight = maxSize;
                    newWidth = Math.round((img.width * maxSize) / img.height);
                }
            }

            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            const optimizedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(optimizedBase64);
        };
        img.onerror = () => reject(new Error('Gabim në ngarkimin e imazhit'));
        img.src = base64;
    });
}

// Make it global for use
window.optoFoto = optoFoto;

// ===================================
// Photo Upload Handlers
// ===================================
if (uploadModelBtn && modelPhotoInput) {
    uploadModelBtn.addEventListener('click', () => {
        modelPhotoInput.click();
    });
}

if (uploadContentBtn && contentPhotosInput) {
    uploadContentBtn.addEventListener('click', () => {
        contentPhotosInput.click();
    });
}

if (modelPhotoInput) {
    modelPhotoInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            showToast(`📸 Po optimizohet modeli: ${file.name}...`, 'info');
            let optimizedBase64 = await optoFoto(file);
            const modelBytes = estimateBase64Bytes(optimizedBase64);
            if (modelBytes > 1024 * 1024) {
                optimizedBase64 = await optimizeBase64Image(optimizedBase64, 1000, 0.9);
            }
            modelPhoto = { name: file.name, base64: optimizedBase64 };
            renderModelPreview();
            updateGenerateButtonState();
            showToast(`✅ Modeli u ngarkua me sukses`, 'success');
        } catch (error) {
            console.error('Gabim në optimizimin e modelit:', error);
            showToast(`❌ Gabim në model: ${error.message}`, 'error');
        }
    });
}

if (contentPhotosInput) {
    contentPhotosInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);

        if (contentPhotos.length + files.length > 10) {
            showToast(`Mund të ngarkohen maksimalisht 10 foto. Keni ${contentPhotos.length} foto.`, 'warning');
            return;
        }

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    showToast(`📸 Po optimizohet: ${file.name}...`, 'info');
                    const optimizedBase64 = await optoFoto(file);
                    contentPhotos.push({ name: file.name, base64: optimizedBase64 });
                    renderContentPreview();
                    updateGenerateButtonState();
                    showToast(`✅ ${file.name} u ngarkua me sukses`, 'success');
                } catch (error) {
                    console.error('Gabim në optimizimin e fotos:', error);
                    showToast(`❌ Gabim në ${file.name}: ${error.message}`, 'error');
                }
            }
        }
    });
}

function renderModelPreview() {
    if (!modelPhotoPreview || !modelPhotoStatus) return;
    modelPhotoPreview.innerHTML = '';
    if (!modelPhoto) {
        modelPhotoStatus.textContent = 'Asnje model i ngarkuar';
        return;
    }

    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-preview';
    photoDiv.innerHTML = `
        <img src="${modelPhoto.base64}" alt="Model Photo">
        <button type="button" class="photo-preview-remove" onclick="removeModelPhoto()">
            <i class="fas fa-times"></i>
        </button>
    `;
    modelPhotoPreview.appendChild(photoDiv);
    modelPhotoStatus.textContent = 'Modeli u ngarkua';
}

function renderContentPreview() {
    if (!contentPhotoPreview || !contentPhotoCount) return;
    contentPhotoPreview.innerHTML = '';
    contentPhotos.forEach((photo, index) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-preview';
        photoDiv.innerHTML = `
            <img src="${photo.base64}" alt="Photo ${index + 1}">
            <button type="button" class="photo-preview-remove" onclick="removeContentPhoto(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        contentPhotoPreview.appendChild(photoDiv);
    });

    contentPhotoCount.textContent = `${contentPhotos.length}/10 foto të ngarkuara`;
}

function removeModelPhoto() {
    modelPhoto = null;
    renderModelPreview();
    updateGenerateButtonState();
}

function removeContentPhoto(index) {
    contentPhotos.splice(index, 1);
    renderContentPreview();
    updateGenerateButtonState();
}

// Make remove helpers global
window.removeModelPhoto = removeModelPhoto;
window.removeContentPhoto = removeContentPhoto;

async function loadFallbackModelBase64() {
    if (cachedFallbackModelBase64) return cachedFallbackModelBase64;
    try {
        const response = await fetch(MODEL_FALLBACK_PATH);
        if (!response.ok) throw new Error('Fallback model not found');
        const blob = await response.blob();
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Gabim në leximin e modelit rezervë'));
            reader.readAsDataURL(blob);
        });
        cachedFallbackModelBase64 = await optimizeBase64Image(base64, 1200, 0.9);
        return cachedFallbackModelBase64;
    } catch (error) {
        console.warn('Nuk u gjet modeli rezervë:', error);
        return null;
    }
}

function updateGenerateButtonState() {
    const fusha = document.getElementById('fusha')?.value?.trim() || '';
    const lenda = document.getElementById('lenda')?.value?.trim() || '';
    const shkalla = document.getElementById('shkalla')?.value?.trim() || '';
    const klasa = document.getElementById('klasa')?.value?.trim() || '';
    const tema1 = document.getElementById('tema1')?.value?.trim() || '';
    
    // Button is enabled if: required fields are filled AND at least one photo is uploaded
    const requiredFieldsFilled = fusha && lenda && shkalla && klasa && tema1;
    const hasPhotos = contentPhotos.length > 0;
    
    if (generateBtn) {
        generateBtn.disabled = !(requiredFieldsFilled && hasPhotos);
    }
    
    // Update button text
    const creditText = `${window.CONFIG.credits.perGeneration} Kredit`;
    if (generateBtn) {
        if (contentPhotos.length > 0) {
            generateBtn.innerHTML = `<i class="fas fa-magic"></i><span>Gjeneroni Ditarin (${creditText})</span>`;
        } else {
            generateBtn.innerHTML = `<i class="fas fa-camera"></i><span>Ngarkoni Foto (Detyruar)</span>`;
        }
    }
}

// Listen for changes in required fields to update button state
document.getElementById('fusha')?.addEventListener('input', updateGenerateButtonState);
document.getElementById('lenda')?.addEventListener('input', updateGenerateButtonState);
document.getElementById('shkalla')?.addEventListener('input', updateGenerateButtonState);
document.getElementById('klasa')?.addEventListener('input', updateGenerateButtonState);
document.getElementById('tema1')?.addEventListener('input', updateGenerateButtonState);

// ===================================
// Generate Diary Handler
// ===================================
generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (generateBtn?.disabled) return;

    if (!firebase.auth().currentUser) {
        showToast('Ju lutem kyçuni për të gjeneruar ditarin.', 'error');
        return;
    }
    
    // Check credits
    if (userCredits < window.CONFIG.credits.perGeneration) {
        showToast('Nuk keni kredite të mjaftueshme. Blini një paketë.', 'error');
        navigateToPage('profile');
        return;
    }
    
    const formData = {
        fusha: document.getElementById('fusha').value.trim(),
        lenda: document.getElementById('lenda').value.trim(),
        shkalla: document.getElementById('shkalla').value.trim(),
        klasa: document.getElementById('klasa').value.trim(),
        tema_1: document.getElementById('tema1').value.trim(),
        tema_2: document.getElementById('tema2').value.trim() || '',
        topic: document.getElementById('tema1').value.trim(), // Backwards compatibility for history title
        isMultipleThemes: multipleThemesCheckbox?.checked || false,
        competences: '',
        duration: '45' // Default, AI may override
    };
    
    try {
        showLoading(true);
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Loading...</span>`;
        }
        
        // Generate diary with OpenAI
        const generatedDiary = await generateDiaryWithAI(formData);
        
        // Display the diary content - USES displayDiaryContent function
        displayDiaryContent(generatedDiary, formData);
        
        // Save to history
        await db.collection('users').doc(currentUser.uid)
            .collection('history').add({
                ...formData,
                content: generatedDiary,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Show result section
        generationResult.style.display = 'block';
        
        // Scroll to result
        generationResult.scrollIntoView({ behavior: 'smooth' });
        
        showToast('Ditari u gjenerua me sukses!', 'success');
        
    } catch (error) {
        const errorMessage = error?.message || 'Gabim gjatë gjenerimit. Provoni përsëri.';
        console.error('Generation error:', errorMessage);
        showToast(errorMessage, 'error');
    } finally {
        showLoading(false);
        if (generateBtn) {
            generateBtn.disabled = false;
            updateGenerateButtonState();
        }
    }
});

// ===================================
// Generate Diary with OpenAI
// ===================================
// ===================================
// Generate Diary with OpenAI
// ===================================
// Synchronized AI Lesson Plan Generator
async function generateDiaryWithAI(formData) {
        const tema1 = formData.tema_1 || 'Tema e Mësimit';
        const tema2 = formData.tema_2 || '';
        const hasExampleReference = !!modelPhoto;
        const exampleReferenceInstruction = hasExampleReference
            ? "Shiko foton e pare. Kjo eshte EXAMPLE_REFERENCE per strukturen, stilin, gjatesine dhe profesionalizmin. Perdor fotot e tjera per permbajtjen e re, por mos kopjo tekstin e modelit, vetem menyren e ndertimit te fjalive dhe ushtrimeve."
            : "";
    
    const prompt = `Je një mësues ekspert. INJORO fushat manuale: fusha, lënda, shkalla, klasa, tema_1, tema_2.
Fokuso vetëm te 11 fushat e mëposhtme. Përdor gjuhë të pastër akademike shqipe.

${exampleReferenceInstruction}

RREGULLA UNIVERSALE:
1. Analizo çdo rresht të fotos së librit. Mos gjenero fjali të përgjithshme.
2. Përshtat shembujt me lëndën dhe temën (Matematikë, Informatikë, Biologji, Gjuhë Shqipe, etj.).
3. Kompetencat (rezultatet) duhet të jenë MINIMUM 5, fjali të ndara dhe pa numërim "Kompetenca 1".
4. Çdo kompetencë fillon me simbol shigjete "➢" dhe është fjali e gjatë që tregon saktësisht aftësinë e fituar nga faqja e librit.
5. Ndërtimi i njohurive duhet të jetë i gjatë, teorik dhe me shembuj konkretë nga ushtrimet e librit.
6. Metodologjia duhet të jetë e gjatë dhe e detajuar, me hapa të qartë se si nxënësi arrin rezultatin.
    Nëse ka figura/vizatime (kub, trekëndësh, hark), përfshi udhëzimin: "Mësuesi udhëzon nxënësit të skicojnë figurën gjeometrike (p.sh. Kubin/Harkun) sipas modelit të paraqitur në faqen [X] të librit".
7. Për çdo ushtrim të dukshëm në foto, krijo paragraf shpjegues me pyetjet që mësuesi i drejton nxënësve.
8. Lidhja me njohuritë e mëparshme duhet të krijojë urë logjike me temën aktuale.
9. Situata, lidhja, burimet, fjalët kyçe, metodologjia, përforcimi dhe vlerësimi duhet të bazohen në foto.
10. Shënimet vlerësuese (N2, N3, N4) duhet të jenë të pasura dhe të bazuara në vështirësinë e ushtrimeve në foto.
11. Detyra e shtëpisë duhet të mbetet bosh (""), pa përmbajtje.
12. Përdor folje vepruese profesionale (p.sh. "Dallon...", "Përcakton...", "Skicon...").

Kthe VETËM objektin JSON me KËTO 11 ÇELËSA:
{
    "situata": "Situata problemore nga foto (fiks, pa përgjithësime)",
    "fushat": "Lidhja me fushat e tjera (fiks si në foto)",
    "burimet": "Lista e burimeve si në foto (p.sh. Libri i nxënësit fq 121-125, drejtëza, trekëndësh)",
    "rezultatet": "➢ Zbaton rregullat e...\\n➢ Identifikon elementet...\\n➢ Analizon rastet...\\n➢ Argumenton zgjidhjet...\\n➢ Përdor konceptet...",
    "fjalet_kyce": "Fjalët kyçe nga foto, ndara me presje",
    "metodologjia": "Metodologjia dhe veprimtaritë e nxënësve",
    "lidhja_e_temes_me_njohurite_e_meparshme": "Urë logjike mes temës aktuale dhe njohurive të mëparshme",
    "ndertimi_i_njohurive": "Përshkrim i gjatë me teori + shembuj konkretë nga tema",
    "perforcimi_i_te_nxenit": "Ushtrime të ngjashme dhe mënyra e kontrollit",
    "shenime_vleresuese": "N2: ...\\nN3: ...\\nN4: ...",
    "detyra_shtepie": ""
}

RREGULL: Kthe VETËM objektin JSON, asgjë më shumë.`;

    try {
        let photosPayload = [];
        try {
            if (hasExampleReference && modelPhoto?.base64) {
                photosPayload.push({
                    base64: modelPhoto.base64,
                    role: 'EXAMPLE_REFERENCE'
                });
            }

            contentPhotos.forEach((photo) => {
                if (photo?.base64) {
                    photosPayload.push({
                        base64: photo.base64,
                        role: 'CONTENT_SOURCE'
                    });
                }
            });
        } catch (photoError) {
            console.warn('Photo payload issue, continuing with available photos:', photoError);
            photosPayload = (contentPhotos || []).filter(p => p?.base64).map(p => ({
                base64: p.base64,
                role: 'CONTENT_SOURCE'
            }));
        }

        const payloadBytes = photosPayload.reduce((sum, photo) => sum + (photo.base64?.length || 0), 0);
        const payloadMB = (payloadBytes / (1024 * 1024)).toFixed(2);
        if (payloadBytes > 8 * 1024 * 1024) {
            console.warn(`Payload i madh i fotove: ${payloadMB} MB. Mund te shkaktoje 413.`);
        }

        if (!photosPayload.length) {
            throw new Error('Ngarkoni fotot e librit përpara gjenerimit.');
        }

        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            throw new Error('Përdoruesi nuk është i kyçur.');
        }

        const response = await fetch(window.CONFIG.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await currentUser.getIdToken()}`
            },
            body: JSON.stringify({
                systemInstruction: "Ti je një mësues profesionist. Foton Model trajtoje si udhëzuesin e vetëm për stilin dhe nivelin e detajeve. Analizo çdo rresht të fotos së librit dhe mos gjenero tekst të përgjithshëm. Shiko foton model dhe kopjo stilin e saj fjali për fjali. Nëse modeli ka 10 pika te kompetencat, nxirr 10 pika nga libri. Përdor simbolin ➢ për çdo rresht të ri te kompetencat dhe shënimet vlerësuese. Kompetencat duhet të jenë fjali të gjata dhe profesionale që përshkruajnë saktësisht aftësinë e fituar. Shënimet vlerësuese (N2, N3, N4) duhet të jenë të pasura dhe të bazuara në vështirësinë e ushtrimeve në foto. Metodologjia duhet të jetë e detajuar me hapa të qartë dhe të përfshijë vizatimet kur shfaqen figura (p.sh. kub, trekëndësh, hark) me udhëzimin: \"Mësuesi udhëzon nxënësit të skicojnë figurën gjeometrike (p.sh. Kubin/Harkun) sipas modelit të paraqitur në faqen [X] të librit\". Për çdo ushtrim në foto, shto paragraf shpjegues me pyetjet që mësuesi i drejton nxënësve. INJORO fushat manuale (fusha, lënda, shkalla, klasa, tema_1, tema_2). Kthe VETËM JSON me 11 çelësat e kërkuar dhe asnjë tekst tjetër. Detyra shtëpie duhet të jetë bosh (\"\").",
                prompt: prompt,
                photos: photosPayload,
                formData: formData,
                response_format: { "type": "json_object" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            const safeMessage = errorText && !errorText.trim().startsWith('<')
                ? errorText
                : 'Gabim në gjenerimin e ditarit. Ju lutem provoni përsëri.';
            throw new Error(safeMessage);
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        // Parse JSON response from AI - ROBUST HANDLING
        let parsedResult;
        try {
            // Handle different response formats
            let content = result.content;
            
            // If content is already an object, use it directly
            if (typeof content === 'object' && content !== null) {
                parsedResult = content;
            } 
            // If content is a string, parse it
            else if (typeof content === 'string') {
                parsedResult = JSON.parse(content);
            }
            // Last resort: check if entire result is the JSON object
            else if (result.message) {
                parsedResult = JSON.parse(result.message);
            }
            else {
                throw new Error('Could not parse response format');
            }
            
            console.log('✅ Parsed JSON successfully:', parsedResult);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Content:', result.content, 'Full result:', result);
            throw new Error('Përgjigja e AI-t nuk është JSON i vlefshëm: ' + e.message);
        }

        // Normalize key name and override manual fields so Word/template always uses user input
        if (parsedResult.fjalet_kyce && !parsedResult.fjalet_kyçe) {
            parsedResult.fjalet_kyçe = parsedResult.fjalet_kyce;
        }
        parsedResult.fusha = formData.fusha;
        parsedResult.lenda = formData.lenda;
        parsedResult.shkalla = formData.shkalla;
        parsedResult.klasa = formData.klasa;
        parsedResult.tema_1 = formData.tema_1;
        parsedResult.tema_2 = formData.tema_2 || '';
        parsedResult.date = '________';
        parsedResult.detyra_shtepie = '';

        const normalizeListLines = (value, splitOnComma = false) => {
            if (!value) return '';
            const raw = String(value);
            const parts = raw.includes('\n')
                ? raw.split(/\r?\n/)
                : (splitOnComma ? raw.split(/[,;]+/) : [raw]);
            return parts.map(part => part.trim()).filter(Boolean).join('\n');
        };

        const normalizeParagraphs = (value) => {
            if (!value) return '';
            const raw = String(value);
            const parts = raw.split(/\r?\n/).map(part => part.trim()).filter(Boolean);
            return parts.join('\n\n');
        };

        const normalizeArrowLines = (value) => {
            if (!value) return '';
            const raw = String(value);
            const parts = raw.includes('\n') ? raw.split(/\r?\n/) : raw.split(/[•➢]/);
            return parts.map(line => line.trim())
                .filter(Boolean)
                .map(line => {
                    const cleaned = line.replace(/^[-–—•➢]\s*/, '');
                    return (line.startsWith('➢') || line.startsWith('•')) ? line : `➢ ${cleaned}`;
                })
                .join('\n');
        };

        const normalizeShenime = (value) => {
            if (!value) return '';
            const raw = String(value)
                .replace(/\s*(N3:)/g, '\n$1')
                .replace(/\s*(N4:)/g, '\n$1');
            return normalizeArrowLines(raw);
        };

        parsedResult.burimet = normalizeListLines(parsedResult.burimet, true);
        parsedResult.metodologjia = normalizeListLines(parsedResult.metodologjia, true);
        parsedResult.rezultatet = normalizeArrowLines(parsedResult.rezultatet);
        parsedResult.shenime_vleresuese = normalizeShenime(parsedResult.shenime_vleresuese);
        parsedResult.ndertimi_i_njohurive = normalizeParagraphs(parsedResult.ndertimi_i_njohurive);

        // Ensure all required fields exist with default values
        const requiredFields = [
            'situata', 'fushat', 'burimet', 'rezultatet', 'fjalet_kyçe',
            'metodologjia', 'lidhja_e_temes_me_njohurite_e_meparshme',
            'ndertimi_i_njohurive', 'perforcimi_i_te_nxenit', 'shenime_vleresuese'
        ];
        
        requiredFields.forEach(field => {
            if (!parsedResult[field] || (typeof parsedResult[field] === 'string' && parsedResult[field].trim() === '')) {
                parsedResult[field] = `[${field} - nuk u plotësua nga AI]`;
                console.warn(`⚠️ Field ${field} is empty, using placeholder`);
            }
        });

        parsedResult.detyra_shtepie = '';

        console.log('✅ All fields validated:', parsedResult);
        return parsedResult;
    } catch (error) {
        console.error('AI generation error:', error);
        throw error;
    }
}

// Helper function to convert AI JSON response to HTML template
function displayDiaryContent(jsonData, formData) {
    // Parse JSON if it's a string
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    console.log('🔄 Displaying diary content:', data);

    // Force manual fields into the data used for export
    data.fusha = formData.fusha;
    data.lenda = formData.lenda;
    data.shkalla = formData.shkalla;
    data.klasa = formData.klasa;
    data.tema_1 = formData.tema_1;
    data.tema_2 = formData.tema_2 || '';
    data.date = '________';
    
    // Store in window.currentDiary (new primary variable)
    window.currentDiary = data;
    window.lastGeneratedJSON = data;
    window.lastTemplateData = data;
    
    // Generate HTML from structured JSON
    const htmlContent = generateHTMLFromJSON(data, formData);
    
    // Set the HTML content
    if (generatedContent) {
        generatedContent.innerHTML = htmlContent;
        generatedContent.style.display = 'block';
        console.log('✅ Diary HTML displayed to DOM');
    } else {
        console.error('❌ generatedContent element not found!');
        showToast('Gabim: elemento i përmbajtjes nuk u gjet', 'error');
        return;
    }
    
    // Verify each field was populated
    const fieldsToCheck = ['tema_1', 'tema_2', 'situata', 'lidhja_e_temes_me_njohurite_e_meparshme', 'ndertimi_i_njohurive'];
    fieldsToCheck.forEach(field => {
        if (data[field]) {
            console.log(`✅ ${field}: populated (${data[field].substring(0, 50)}...)`);
        } else {
            console.warn(`⚠️ ${field}: empty or missing`);
        }
    });
    
    showToast('Ditari u gjenerua me sukses!', 'success');
    console.log('✅ Diary displayed successfully. Data stored in window.currentDiary');
}

function generateHTMLFromJSON(data, formData) {
    // Ensure data is object
    if (typeof data === 'string') data = JSON.parse(data);
    
    const tema_2_display = data.tema_2 && data.tema_2.trim() ? data.tema_2 : '';
    
    const htmlTemplate = `
<div style="width: 100%; margin: 0; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #000; padding: 0;">
    <h1 style="text-align: center;">PLANIFIKIMI I ORËVE TË MËSIMIT</h1>
    <div style="text-align: right; margin-bottom: 10px; font-style: italic;">Data __________</div>

    <!-- TABELA 1: Informacioni bazë -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
        <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Fusha: ${formData.fusha || data.fusha || ''}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Lënda: ${formData.lenda || data.lenda || ''}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Shkalla: ${formData.shkalla || data.shkalla || ''}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Klasa: ${formData.klasa || data.klasa || ''}</strong></td>
        </tr>
    </table>

    <!-- TABELA 2: Përmbajtja kryesore -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none;">
        <tr>
            <td style="border: 1px solid #000; padding: 10px; width: 40%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><em>Tema 1:</em> ${data.tema_1 || ''}</p>
                ${tema_2_display ? `<p style="margin: 0 0 8px 0;"><em>Tema 2:</em> ${tema_2_display}</p>` : ''}
                <p style="margin: 0 0 8px 0;"><em>Situata e parashikuar e të nxënit:</em> ${data.situata || ''}</p>
                <p style="margin: 0 0 6px 0;"><em>Lidhja me fushat e tjera:</em></p>
                <p style="margin: 0 0 8px 0; white-space: pre-wrap;">${data.fushat || ''}</p>
                <p style="margin: 0 0 6px 0;"><em>Burimet e informacionit dhe mjetet:</em></p>
                <p style="margin: 0; white-space: pre-wrap;">${data.burimet || ''}</p>
            </td>
            <td style="border: 1px solid #000; padding: 10px; width: 60%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><em>Rezultatet e të nxënit të kompetencave:</em></p>
                <p style="margin: 0; white-space: pre-wrap;">${data.rezultatet || ''}</p>
                <p style="margin: 8px 0 0 0;"><em>Fjalët kyçe:</em> ${data.fjalet_kyçe || ''}</p>
            </td>
        </tr>
        <tr>
            <td colspan="2" style="border: 1px solid #000; padding: 10px; vertical-align: top;">
                <p style="margin: 0 0 6px 0;"><em>Metodologjia dhe veprimtaritë e nxënësve:</em></p>
                <p style="margin: 0; white-space: pre-wrap;">${data.metodologjia || ''}</p>
            </td>
        </tr>
    </table>

    <!-- TABELA 3: Zhvillimi -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none;">
        <tr>
            <td style="border: 1px solid #000; padding: 12px;">
                <p style="margin: 0 0 8px 0;"><strong>— Lidhja e temës me njohuritë e mëparshme:</strong></p>
                <p style="margin: 0 0 12px 0; white-space: pre-wrap;">${data.lidhja_e_temes_me_njohurite_e_meparshme || ''}</p>
                
                <p style="margin: 0 0 8px 0;"><strong>— Ndërtimi i njohurive:</strong></p>
                <p style="margin: 0 0 12px 0; white-space: pre-wrap;">${data.ndertimi_i_njohurive || ''}</p>
                
                <p style="margin: 0 0 8px 0;"><strong>— Përforcimi i nxënit:</strong></p>
                <p style="margin: 0; white-space: pre-wrap;">${data.perforcimi_i_te_nxenit || ''}</p>
            </td>
        </tr>
    </table>

    <!-- TABELA 4: Vlerësimi dhe Detyra -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none;">
        <tr>
            <td style="border: 1px solid #000; padding: 12px; width: 65%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><strong>Shenime vlerësuese:</strong></p>
                <p style="margin: 0; white-space: pre-wrap;">${data.shenime_vleresuese || ''}</p>
            </td>
            <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 12px; width: 35%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><strong>Detyra shtëpie:</strong></p>
                <p style="margin: 0;">${data.detyra_shtepie || ''}</p>
            </td>
        </tr>
    </table>
</div>
    `;
    
    return htmlTemplate;
}

// ===================================
// Copy to Clipboard
// ===================================
copyBtn.addEventListener('click', () => {
    const content = generatedContent.innerText;
    navigator.clipboard.writeText(content)
        .then(() => {
            showToast('Përmbajtja u kopjua!', 'success');
            copyBtn.innerHTML = '<i class="fas fa-check"></i> U Kopjua';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Kopjo';
            }, 2000);
        })
        .catch(() => {
            showToast('Gabim në kopjim.', 'error');
        });
});

// ===================================
// Load History
// ===================================
async function loadHistory() {
    try {
        const snapshot = await db.collection('users')
            .doc(currentUser.uid)
            .collection('history')
            .orderBy('createdAt', 'desc')
            .get();
        
        userHistory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderHistory();
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// ===================================
// Render History
// ===================================
function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (userHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Nuk keni gjeneruar ende asnjë ditar</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = userHistory.map(item => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-header">
                <div class="history-info">
                    <h3>${item.tema_1 || item.topic || ''}</h3>
                    <div class="history-meta">
                        <span><i class="fas fa-book"></i> ${item.lenda || ''}</span>
                        <span><i class="fas fa-layer-group"></i> ${item.shkalla || ''} / ${item.klasa || ''}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn view-btn" onclick="viewHistoryItem('${item.id}')">
                        <i class="fas fa-eye"></i> Shiko
                    </button>
                    <button class="history-btn delete-btn" onclick="deleteHistoryItem('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===================================
// View History Item
// ===================================
function viewHistoryItem(id) {
    const item = userHistory.find(h => h.id === id);
    if (!item) return;
    
    // Navigate to generate page
    navigateToPage('generate');
    
    // Fill form (only existing fields)
    document.getElementById('fusha').value = item.fusha || '';
    document.getElementById('lenda').value = item.lenda || '';
    document.getElementById('shkalla').value = item.shkalla || '';
    document.getElementById('klasa').value = item.klasa || '';
    document.getElementById('tema1').value = item.tema_1 || '';
    document.getElementById('tema2').value = item.tema_2 || '';
    
    // Show result
    generatedContent.innerHTML = item.content;
    generationResult.style.display = 'block';
    
    // Scroll to result
    setTimeout(() => {
        generationResult.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

// ===================================
// Delete History Item
// ===================================
async function deleteHistoryItem(id) {
    if (!confirm('Jeni i sigurt që doni ta fshini këtë ditar?')) {
        return;
    }
    
    try {
        await db.collection('users')
            .doc(currentUser.uid)
            .collection('history')
            .doc(id)
            .delete();
        
        showToast('Ditari u fshi me sukses.', 'success');
    } catch (error) {
        console.error('Error deleting history:', error);
        showToast('Gabim në fshirje.', 'error');
    }
}

// ===================================
// Pricing Buttons (Stripe)
// ===================================
async function blejKredite(sasia) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast('Ju lutem kyçuni për të vazhduar me pagesën.', 'error');
        return;
    }

    try {
        showLoading(true);
        
        const idToken = await user.getIdToken();
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                packageSize: Number(sasia),
                userId: user.uid
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Server error response:', error);
            throw new Error(error.detail || error.message || error.error || 'Gabim në krijimin e sesionit të pagesës');
        }

        const data = await response.json();
        console.log('Checkout session response:', data);
        
        if (data.url) {
            // Redirect to Stripe checkout
            console.log('Redirecting to:', data.url);
            window.location.href = data.url;
        } else {
            throw new Error('URL e pagesës nuk u gjet. Ju lutem provoni përsëri.');
        }
    } catch (error) {
        console.error('Payment error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        const errorMsg = error.message || 'Gabim në krijimin e pagesës. Kontrolloni lidhjen me internetin dhe provoni përsëri.';
        showToast(errorMsg, 'error');
    } finally {
        showLoading(false);
    }
}

window.blejKredite = blejKredite;

document.querySelectorAll('.pricing-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const packageSize = btn.dataset.package;
        blejKredite(packageSize);
    });
});

// Load and Display Promo Pricing
async function loadPromoConfig() {
    try {
        const db = firebase.firestore();
        const promoDoc = await db.collection('settings').doc('promo_config').get();
        
        if (promoDoc.exists) {
            const promoData = promoDoc.data();
            
            if (promoData.is_active && promoData.discount_percent) {
                const discountPercent = promoData.discount_percent;
                let expiryDate = promoData.expiry_date;
                
                // Show promo notice
                const promoNotice = document.getElementById('promoNotice');
                if (promoNotice) {
                    promoNotice.style.display = 'block';
                    document.getElementById('promoPercent').textContent = discountPercent;
                    
                    // Format expiry date - with better error handling
                    if (expiryDate) {
                        try {
                            let expiryMs;
                            // Handle Firebase Timestamp
                            if (expiryDate && typeof expiryDate === 'object') {
                                if (typeof expiryDate.toMillis === 'function') {
                                    expiryMs = expiryDate.toMillis();
                                } else if (typeof expiryDate.getTime === 'function') {
                                    expiryMs = expiryDate.getTime();
                                } else if (expiryDate._seconds) {
                                    // Firebase timestamp format
                                    expiryMs = expiryDate._seconds * 1000;
                                } else {
                                    expiryMs = new Date(expiryDate).getTime();
                                }
                            } else if (typeof expiryDate === 'string') {
                                expiryMs = new Date(expiryDate).getTime();
                            } else if (typeof expiryDate === 'number') {
                                expiryMs = expiryDate;
                            }
                            
                            if (expiryMs && !isNaN(expiryMs)) {
                                const expiryDateObj = new Date(expiryMs);
                                const formattedDate = expiryDateObj.toLocaleDateString('sq-AL', { 
                                    day: 'numeric', 
                                    month: 'long'
                                });
                                document.getElementById('promoExpiry').textContent = formattedDate;
                            }
                        } catch (e) {
                            console.warn('Could not format expiry date:', e);
                        }
                    }
                }
                
                // Update prices
                const packages = [10, 20, 30, 50];
                const originalPrices = {
                    10: 399,    // €3.99
                    20: 699,    // €6.99
                    30: 899,    // €8.99
                    50: 1299    // €12.99
                };
                
                packages.forEach(pkg => {
                    try {
                        const originalPrice = originalPrices[pkg]; // në cents
                        const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
                        
                        // Update display
                        const button = document.querySelector(`[data-package="${pkg}"]`);
                        if (!button) return;
                        
                        const priceContainer = button.closest('.pricing-card').querySelector('.pricing-price-container');
                        if (!priceContainer) return;
                        
                        const regularPrice = priceContainer.querySelector('.pricing-price');
                        const discountDiv = priceContainer.querySelector('.pricing-discount');
                        const oldPriceSpan = discountDiv?.querySelector('.pricing-old');
                        const discountedPriceSpan = discountDiv?.querySelector('.pricing-new');
                        
                        // Show discount layout with old price struck through
                        if (regularPrice) regularPrice.style.display = 'none';
                        if (discountDiv) {
                            discountDiv.style.display = 'flex';
                            const originalEuro = (originalPrice / 100).toFixed(2);
                            const discountedEuro = (discountedPrice / 100).toFixed(2);
                            if (oldPriceSpan) oldPriceSpan.textContent = `€${originalEuro}`;
                            if (discountedPriceSpan) discountedPriceSpan.textContent = `€${discountedEuro}`;
                        }
                        
                        console.log(`✅ Price ${pkg}: €${(originalPrice/100).toFixed(2)} → €${(discountedPrice/100).toFixed(2)}`);
                    } catch (err) {
                        console.warn(`Could not update price for package ${pkg}:`, err.message);
                    }
                });
            }
        }
    } catch (error) {
        console.warn('Could not load promo config:', error.message);
    }
}

// Load promo when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPromoConfig);
} else {
    loadPromoConfig();
}

// ===================================
// Profile Security Buttons
// ===================================
const changePasswordBtn = document.getElementById('changePasswordBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');

if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async () => {
        const newPassword = prompt('Shkruani fjalëkalimin e ri:');
        if (!newPassword) return;
        
        if (newPassword.length < 6) {
            showToast('Fjalëkalimi duhet të ketë të paktën 6 karaktere.', 'error');
            return;
        }
        
        try {
            showLoading(true);
            await currentUser.updatePassword(newPassword);
            showToast('Fjalëkalimi u ndryshua me sukses!', 'success');
        } catch (error) {
            console.error('Password change error:', error);
            let message = 'Gabim në ndryshimin e fjalëkalimit.';
            if (error.code === 'auth/weak-password') {
                message = 'Fjalëkalimi është shumë i dobët.';
            } else if (error.code === 'auth/requires-recent-login') {
                message = 'Duhet të hyrni përsëri për të ndryshuar fjalëkalimin.';
            }
            showToast(message, 'error');
        } finally {
            showLoading(false);
        }
    });
}

if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
        try {
            showLoading(true);
            await firebase.auth().sendPasswordResetEmail(currentUser.email);
            showToast('Linku për rivendosjen e fjalëkalimit u dërgua në email.', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            showToast('Gabim në dërgimin e email-it.', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// ===================================
// Load Current Package Info
// ===================================
async function loadCurrentPackageInfo() {
    const packageInfoEl = document.getElementById('currentPackageInfo');
    if (!packageInfoEl) return;
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            const credits = userData.credits || 0;
            const createdAt = userData.createdAt?.toDate() || new Date();
            
            // Determine package name based on credits (you can adjust this logic)
            let packageName = 'Standard';
            if (credits <= 5) packageName = 'Starter';
            else if (credits <= 20) packageName = 'Popular';
            else if (credits <= 30) packageName = 'Pro';
            else packageName = 'Premium';
            
            const dateStr = createdAt.toLocaleDateString('sq-AL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            packageInfoEl.innerHTML = `
                <div class="package-info-item">
                    <span class="package-info-label">Emri i Paketës</span>
                    <span class="package-info-value">${packageName}</span>
                </div>
                <div class="package-info-item">
                    <span class="package-info-label">Kredite të Tanishme</span>
                    <span class="package-info-value">${credits}</span>
                </div>
                <div class="package-info-item">
                    <span class="package-info-label">Data e Hyrjes</span>
                    <span class="package-info-value">${dateStr}</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading package info:', error);
        packageInfoEl.innerHTML = '<p style="text-align: center; color: #999;">Gabim në ngarkimin e informacionit.</p>';
    }
}

// Load package info when navigating to profile
const originalNavigateToPage = navigateToPage;
window.navigateToPage = function(pageName) {
    originalNavigateToPage(pageName);
    if (pageName === 'profile') {
        loadCurrentPackageInfo();
    }
};

// ===================================
// Legal Pages Navigation
// ===================================
function setupLegalLinks() {
    // Select all links with data-page="privacy" or data-page="terms"
    const legalLinks = document.querySelectorAll('[data-page="privacy"], [data-page="terms"]');
    console.log(`Setting up ${legalLinks.length} legal links`);
    
    legalLinks.forEach(link => {
        // Remove any existing listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const page = newLink.dataset.page;
            console.log(`Navigating to ${page} page`);
            navigateToPage(page);
        });
    });
}

// Setup legal links on page load
setupLegalLinks();

// Re-setup after a short delay to catch dynamically added footer
setTimeout(() => {
    setupLegalLinks();
}, 1000);

// ===================================
// Logout
// ===================================
logoutBtn.addEventListener('click', () => {
    if (confirm('Jeni i sigurt që doni të dilni?')) {
        logout();
    }
});