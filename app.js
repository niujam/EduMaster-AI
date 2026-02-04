// ===================================
// Global Variables
// ===================================
let currentUser = null;
let userCredits = 0;
let userHistory = [];
let uploadedPhotos = []; // Array për të ruajtur fotot e ngarkuara

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
const photoInput = document.getElementById('photoInput');
const uploadPhotosBtn = document.getElementById('uploadPhotosBtn');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');
const photoCount = document.getElementById('photoCount');
const multipleThemesCheckbox = document.getElementById('multipleThemesCheckbox');

// ===================================
// DOM Elements - Credits Display
// ===================================
const creditsCount = document.getElementById('creditsCount');
const creditsDisplay = document.getElementById('creditsDisplay');
const profileCredits = document.getElementById('profileCredits');

// Safety check for critical elements
if (!creditsCount || !creditsDisplay || !profileCredits) {
    console.warn('⚠️ Some credit display elements are missing');
}

// ===================================
// Initialize App
// ===================================
function initializeApp(user) {
    currentUser = user;
    
    // Set user name with safety checks
    const userName = document.getElementById('userName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const securityEmail = document.getElementById('securityEmail');
    
    const displayName = user.displayName || 'Përdorues';
    const email = user.email || '';
    
    if (userName) userName.textContent = displayName;
    if (profileName) profileName.textContent = displayName;
    if (profileEmail) profileEmail.textContent = email;
    if (securityEmail) securityEmail.textContent = email;
    
    // Load user data
    loadUserData();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Check for URL parameters (e.g., ?page=buyCredits from Stripe cancel)
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        console.log(`Navigating to page from URL parameter: ${pageParam}`);
        navigateToPage(pageParam);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check and start tour if user is new
    if (typeof checkAndStartTour === 'function') {
        checkAndStartTour();
    }
    
    // Setup legal links after a short delay
    setTimeout(() => {
        setupLegalLinks();
        console.log('Legal links setup completed');
    }, 500);
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
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            userCredits = userData.credits || 0;
            
            updateCreditsDisplay(userCredits);
            updateStats(userData);
        } else {
            console.log('User document does not exist, creating new user profile');
            // Create initial user document
            await db.collection('users').doc(currentUser.uid).set({
                credits: 0,
                totalGenerated: 0,
                totalDownloads: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            updateCreditsDisplay(0);
        }
        
        // Load history
        await loadHistory();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Don't show error toast on initial load to avoid annoying users
        console.warn('Failed to load user data, will retry automatically');
        // Retry after 2 seconds
        setTimeout(() => loadUserData(), 2000);
    }
}

// ===================================
// Setup Realtime Listeners
// ===================================
function setupRealtimeListeners() {
    // Listen to user credits changes
    db.collection('users').doc(currentUser.uid)
        .onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                userCredits = userData.credits || 0;
                updateCreditsDisplay(userCredits);
                updateStats(userData);
            }
        });
    
    // Listen to history changes
    db.collection('users').doc(currentUser.uid)
        .collection('history')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            userHistory = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            renderHistory();
        });
}

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
// Update Credits Display
// ===================================
function updateCreditsDisplay(credits) {
    if (creditsCount) creditsCount.textContent = credits;
    if (creditsDisplay) creditsDisplay.textContent = credits;
    if (profileCredits) profileCredits.textContent = credits;
}

// ===================================
// Update Stats
// ===================================
function updateStats(userData) {
    const totalGenerated = document.getElementById('totalGenerated');
    const totalDownloads = document.getElementById('totalDownloads');
    const profileGenerated = document.getElementById('profileGenerated');
    
    if (totalGenerated) totalGenerated.textContent = userData.totalGenerated || 0;
    if (totalDownloads) totalDownloads.textContent = userData.totalDownloads || 0;
    if (profileGenerated) profileGenerated.textContent = userData.totalGenerated || 0;
}

// ===================================
// Navigation System
// ===================================
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = item.dataset.page;
        navigateToPage(targetPage);
    });
});

function navigateToPage(pageName) {
    console.log(`Navigating to page: ${pageName}`);
    
    // Close sidebar on navigation
    sidebar.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
    
    // Hide hamburger toggle when navigation happens (except on mobile)
    if (window.innerWidth > 968) {
        document.body.classList.remove('sidebar-closed');
    }
    
    // Update active nav item (only for sidebar items)
    navItems.forEach(nav => nav.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Update active page
    pages.forEach(page => page.classList.remove('active'));
    const activePage = document.getElementById(`${pageName}Page`);
    if (activePage) {
        activePage.classList.add('active');
        console.log(`Activated page: ${pageName}Page`);
        
        // Scroll to top
        window.scrollTo(0, 0);
    } else {
        console.error(`Page not found: ${pageName}Page`);
    }
    
    // Show/hide back button
    if (pageName === 'home') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
    }
}

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
    document.body.appendChild(toggle);
    return toggle;
}

function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-closed');
    
    // Add overlay on mobile when sidebar opens
    if (window.innerWidth <= 968 && sidebar.classList.contains('open')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }
}

// Close sidebar when clicking on nav items
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 968) {
            sidebar.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.remove();
        }
    });
});

// Add toggle button if it doesn't exist
if (!document.querySelector('.sidebar-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = '☰';
    toggle.type = 'button';
    toggle.addEventListener('click', toggleSidebar);
    document.body.appendChild(toggle);
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
// ===================================
// Sidebar Toggle
// ===================================
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    
    // Add overlay on mobile
    if (window.innerWidth <= 968 && sidebar.classList.contains('open')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay active';
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.remove();
        });
        document.body.appendChild(overlay);
    }
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    document.querySelector('.sidebar-overlay')?.remove();
});

// Close sidebar when clicking outside (Glassmorphism effect)
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 968) {
        if (!sidebar.contains(e.target) && 
            !toggleSidebarBtn.contains(e.target) && 
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.remove();
        }
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
 * dhe duke e konvertuar në Base64 me cilësi 0.7
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
                
                // Konverto në Base64 JPEG me cilësi 0.7
                const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
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

// Make it global for use
window.optoFoto = optoFoto;

// ===================================
// Photo Upload Handlers
// ===================================
uploadPhotosBtn.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 10 photos total
    if (uploadedPhotos.length + files.length > 10) {
        showToast(`Mund të ngarkohet maksimalisht 10 foto. Keni ${uploadedPhotos.length} foto.`, 'warning');
        return;
    }
    
    // Process each file with optimization
    for (const file of files) {
        if (file.type.startsWith('image/')) {
            try {
                showToast(`📸 Po optimizohet: ${file.name}...`, 'info');
                
                // Optimize the photo
                const optimizedBase64 = await optoFoto(file);
                
                uploadedPhotos.push({
                    name: file.name,
                    base64: optimizedBase64
                });
                
                renderPhotoPreview();
                updateGenerateButtonState();
                
                showToast(`✅ ${file.name} u ngarkua me sukses`, 'success');
            } catch (error) {
                console.error('Gabim në optimizimin e fotos:', error);
                showToast(`❌ Gabim në ${file.name}: ${error.message}`, 'error');
            }
        }
    }
});

function renderPhotoPreview() {
    photoPreviewContainer.innerHTML = '';
    uploadedPhotos.forEach((photo, index) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-preview';
        photoDiv.innerHTML = `
            <img src="${photo.base64}" alt="Photo ${index + 1}">
            <button type="button" class="photo-preview-remove" onclick="removePhoto(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        photoPreviewContainer.appendChild(photoDiv);
    });
    
    // Update photo count
    photoCount.textContent = `${uploadedPhotos.length}/10 foto të ngarkuara`;
}

function removePhoto(index) {
    uploadedPhotos.splice(index, 1);
    renderPhotoPreview();
    updateGenerateButtonState();
}

// Make removePhoto global
window.removePhoto = removePhoto;

function updateGenerateButtonState() {
    const subject = document.getElementById('subject').value.trim();
    const grade = document.getElementById('grade').value.trim();
    
    // Button is enabled if: required fields are filled AND at least one photo is uploaded
    const requiredFieldsFilled = subject && grade;
    const hasPhotos = uploadedPhotos.length > 0;
    
    generateBtn.disabled = !(requiredFieldsFilled && hasPhotos);
    
    // Update button text
    const creditText = `${window.CONFIG.credits.perGeneration} Kredit`;
    if (uploadedPhotos.length > 0) {
        generateBtn.innerHTML = `<i class="fas fa-magic"></i><span>Gjeneroni Ditarin (${creditText})</span>`;
    } else {
        generateBtn.innerHTML = `<i class="fas fa-camera"></i><span>Ngarkoni Foto (Detyruar)</span>`;
    }
}

// Listen for changes in required fields to update button state
document.getElementById('subject').addEventListener('input', updateGenerateButtonState);
document.getElementById('grade').addEventListener('input', updateGenerateButtonState);

// ===================================
// Generate Diary Handler
// ===================================
generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check credits
    if (userCredits < window.CONFIG.credits.perGeneration) {
        showToast('Nuk keni kredite të mjaftueshme. Blini një paketë.', 'error');
        navigateToPage('profile');
        return;
    }
    
    const formData = {
        subject: document.getElementById('subject').value.trim(),
        grade: document.getElementById('grade').value.trim(),
        date: new Date().toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' }),
        topic1: document.getElementById('topic1').value.trim(),
        topic2: document.getElementById('topic2').value.trim() || '', // Empty string if not filled
        topic: document.getElementById('topic1').value.trim(), // Keep as 'topic' for backwards compatibility
        isMultipleThemes: multipleThemesCheckbox.checked,
        competences: '',
        duration: '45' // Default, AI may override
    };
    
    try {
        showLoading(true);
        generateBtn.disabled = true;
        
        // Generate diary with OpenAI
        const generatedDiary = await generateDiaryWithAI(formData);
        
        // NOTE: Credits are deducted server-side atomically during generation
        // (no client-side deduction needed)
        
        // Save to history
        await db.collection('users').doc(currentUser.uid)
            .collection('history').add({
                ...formData,
                content: generatedDiary,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Display result
        generatedContent.innerHTML = generatedDiary;
        generationResult.style.display = 'block';
        
        // Scroll to result
        generationResult.scrollIntoView({ behavior: 'smooth' });
        
        showToast('Ditari u gjenerua me sukses!', 'success');
        
    } catch (error) {
        console.error('Generation error:', error);
        showToast('Gabim gjatë gjenerimit. Provoni përsëri.', 'error');
    } finally {
        showLoading(false);
        generateBtn.disabled = false;
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
    const topic1 = formData.topic1 || formData.topic || 'Tema e Mësimit';
    const topic2 = formData.topic2 || '';
    
  const prompt = `JE NJE EKSPERT I KURRIKULËS ARSIMORE SHQIPTARE.
Gjenero një plan mësimi profesional JSON për temën: "${topic1}" ${topic2 ? `dhe "${topic2}"` : ""}.

STRUKTURA E OBJEKTIT JSON (13 FUSHA):
{
  "tema_1": "${topic1}",
  "tema_2": "${topic2 || ""}",
  "situata": "Krijo një situatë konkrete praktike/problemore që motivon nxënësit për këtë temë.",
  "fushat": "Përcakto fushat që lidhen saktë me temën (p.sh. Shoqëria dhe Mjedisi, Shkencat etj.)",
  "burimet": "Rendit mjetet: Libri i nxënësit, tabela, mjete digjitale, materiale konkrete.",
  "rezultatet": "Gjenero 4-6 rezultate të nxëni sipas kompetencave. SECILI rresht duhet të fillojë me '-> ' dhe të përfundojë me '\\n'.",
  "fjalet_kyçe": "Rendit 5 terma teknikë/shkencorë kryesorë të ndarë me presje.",
  "metodologjia": "Përdor metoda aktive: Pyetje-përgjigje, Stuhi mendimesh, Punë në grupe.",
  "lidhja_e_temes_me_njohurite_e_meparshme": "Përshkruaj shkurt çfarë duhet të dinë nxënësit për të kuptuar këtë mësim.",
  "ndertimi_i_njohurive": "Shpjego konceptet e reja dhe jep 2 shembuj/ushtrime të zgjidhura hap pas hapi.",
  "perforcimi_i_te_nxenit": "Kërko nga nxënësit të zgjidhin një detyrë ose të argumentojnë një koncept.",
  "shenime_vleresuese": "-> N2: Nxënësi përshkruan/emërton konceptet bazë.\\n-> N3: Nxënësi analizon dhe zbaton njohuritë.\\n-> N4: Nxënësi argumenton dhe zgjidh situata komplekse.",
  "detyra": "Jep detyra specifike nga libri ose kërkim individual."
}

RREGULLAT KRITIKE:
1. UNIVERSALITETI: Përshtat përmbajtjen në varësi të lëndës (nëse tema është Histori, përdor fakte; nëse është Matematikë, përdor formula).
2. FORMATI: Kthe vetëm JSON-in e pastër. Mos shkruaj asnjë tekst tjetër.
3. NDARJA: Përdor '\\n' për të krijuar rreshta të rinj brenda fushave 'rezultatet' dhe 'shenime_vleresuese' që të dalin bukur në Word.`;



    try {
        const response = await fetch(window.CONFIG.openai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
            },
            body: JSON.stringify({
                prompt: prompt,
                photoUrls: uploadedPhotos.map(p => p.url) || [],
                formData: formData
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Gabim në gjenerimin e ditarit');
        }

        const result = await response.json();
        
        // Parse JSON response from AI
        let parsedResult;
        try {
            // Try to extract JSON from the response
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0]);
            } else {
                parsedResult = JSON.parse(result.content);
            }
        } catch (e) {
            console.warn('Could not parse AI response as JSON, using as is:', result.content);
            parsedResult = { content: result.content };
        }

        // Convert JSON to HTML template with proper formatting
        if (parsedResult && typeof parsedResult === 'object' && !parsedResult.content) {
            return generateHTMLFromJSON(parsedResult, formData);
        }
        
        return parsedResult;
    } catch (error) {
        console.error('AI generation error:', error);
        throw error;
    }
}

// Helper function to convert AI JSON response to HTML template
function generateHTMLFromJSON(data, formData) {
    // Ensure empty tema_2 displays as empty, not "undefined"
    const tema_2_display = data.tema_2 && data.tema_2.trim() ? data.tema_2 : '';
    
    const htmlTemplate = `
<div style="width: 100%; margin: 0; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #000; padding: 0;">
    <h1 style="text-align: center;">PLANIFIKIMI I ORËVE TË MËSIMIT</h1>
    <div style="text-align: right; margin-bottom: 10px; font-style: italic;">Data ${formData.date}</div>

    <!-- TABELA 1: Informacioni bazë -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
        <tr>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Fusha: ${formData.subject}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Lënda: ${formData.subject}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Shkalla: ${formData.grade}</strong></td>
            <td style="border: 1px solid #000; padding: 6px; width: 25%;"><strong>Klasa: ${formData.grade}</strong></td>
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
                <p style="margin: 0 0 8px 0;">${data.fushat || ''}</p>
                <p style="margin: 0 0 6px 0;"><em>Burimet e informacionit dhe mjetet:</em></p>
                <p style="margin: 0;">${data.burimet || ''}</p>
            </td>
            <td style="border: 1px solid #000; padding: 10px; width: 60%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><em>Rezultatet e të nxënit të kompetencave: Nxënësi:</em></p>
                <p style="margin: 0;">➢ ${data.kompetenca_1 || ''}</p>
                <p style="margin: 0;">➢ ${data.kompetenca_2 || ''}</p>
                <p style="margin: 0;">➢ ${data.kompetenca_3 || ''}</p>
                <p style="margin: 0;">➢ ${data.kompetenca_4 || ''}</p>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 10px; width: 40%; vertical-align: top;">
                <p style="margin: 0 0 6px 0;"><em>Metodologjia dhe veprimtaritë e nxënësve:</em></p>
                <p style="margin: 0; text-align: center;">${data.metodologjia || ''}</p>
            </td>
            <td style="border: 1px solid #000; padding: 10px; width: 60%; vertical-align: top;">
                <p style="margin: 0 0 6px 0;"><em>Fjalët kyçe:</em></p>
                <p style="margin: 0;">${data.fjalet_kyçe || ''}</p>
            </td>
        </tr>
    </table>

    <!-- TABELA 3: Zhvillimi (merged cells) -->
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
                <p style="margin: 0;">${data.detyra || ''}</p>
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
                    <h3>${item.topic}</h3>
                    <div class="history-meta">
                        <span><i class="fas fa-book"></i> ${item.subject}</span>
                        <span><i class="fas fa-layer-group"></i> ${item.grade}</span>
                        <span><i class="fas fa-calendar"></i> ${item.date}</span>
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
    document.getElementById('subject').value = item.subject;
    document.getElementById('grade').value = item.grade;
    
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