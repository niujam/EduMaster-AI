// ===================================
// Global Variables
// ===================================
let currentUser = null;
let userCredits = 0;
let userHistory = [];

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
// DOM Elements - Credits Display
// ===================================
const creditsCount = document.getElementById('creditsCount');
const creditsDisplay = document.getElementById('creditsDisplay');
const profileCredits = document.getElementById('profileCredits');

// ===================================
// Initialize App
// ===================================
function initializeApp(user) {
    currentUser = user;
    
    // Set user name
    const userName = document.getElementById('userName');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    
    userName.textContent = user.displayName || 'Përdorues';
    profileName.textContent = user.displayName || 'Përdorues';
    profileEmail.textContent = user.email;
    
    // Load user data
    loadUserData();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Set default date for lesson
    document.getElementById('lessonDate').valueAsDate = new Date();
}

// ===================================
// Load User Data
// ===================================
async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            userCredits = userData.credits || 0;
            
            updateCreditsDisplay(userCredits);
            updateStats(userData);
        }
        
        // Load history
        await loadHistory();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Gabim në ngarkimin e të dhënave.', 'error');
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
    creditsCount.textContent = credits;
    creditsDisplay.textContent = credits;
    profileCredits.textContent = credits;
}

// ===================================
// Update Stats
// ===================================
function updateStats(userData) {
    document.getElementById('totalGenerated').textContent = userData.totalGenerated || 0;
    document.getElementById('totalDownloads').textContent = userData.totalDownloads || 0;
    document.getElementById('profileGenerated').textContent = userData.totalGenerated || 0;
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
    // Update active nav item
    navItems.forEach(nav => nav.classList.remove('active'));
    const activeNav = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Update active page
    pages.forEach(page => page.classList.remove('active'));
    const activePage = document.getElementById(`${pageName}Page`);
    if (activePage) {
        activePage.classList.add('active');
    }
    
    // Show/hide back button
    if (pageName === 'home') {
        backBtn.style.display = 'none';
    } else {
        backBtn.style.display = 'flex';
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 968) {
        sidebar.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
    }
}

// Back button
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
        topic: document.getElementById('topic').value.trim(),
        competences: document.getElementById('competences').value.trim(),
        duration: document.getElementById('duration').value,
        date: document.getElementById('lessonDate').value
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
async function generateDiaryWithAI(formData) {
    const prompt = `INSTRUKSIONE KRITIKE: Gjenero VETËM HTML template-in me këto vlesat KONKRETE zëvendësuese në vend të {...}

ZËVENDËSIMET DETYRUESE:
{tema_1} = ${formData.topic}
{tema_2} = Vazhdimi i temës: ${formData.topic}
{situata} = Një situatë praktike mësimore ku nxënësit zbatojnë konceptet e ${formData.topic}
{fushat} = Shkenca e Natyrës, Gjuhë dhe komunikim, Teknologji, Arte
{burimet} = Libri i nxënësit, Materiale vizuale, Tabela, Mjete didaktike, Tabela interaktive
{kompetenca_1} = Kryen veprime themelore lidhur me ${formData.topic}
{kompetenca_2} = Përcakton konceptet bazë të ${formData.topic} dhe aplikon njohuritë
{kompetenca_3} = Njehson dhe analizon problemet komplekse të ${formData.topic}
{kompetenca_4} = Përdor strategji të avancuara dhe arsyeton zgjidhjet për ${formData.topic}
{fjalet_kyçe} = Shënime, ${formData.topic}, Vetitë, Llogaritjet, Zbatim
{metodologjia} = Pyetje-përgjigje, Punë individuale, Punë dyshe, Diskutim i grupit
{fase_1} = Aktivizoj njohuritë e mëparshme për ${formData.topic} me pyetje udhëheqëse. Nxënësit japin shembuj nga jeta reale. Diskutojmë në grup për të lidhur njohuritë e vjetra me temën e re. Sqarojmë termat kryesorë.
{fase_2} = Prezantoj konceptet e reja të ${formData.topic} me shembuj konkretë dhe materiale vizuale. Nxënësit punojnë individualisht dhe në dyshe me ushtrime të shkallëzuara. Përdorim diskutim, analizë dhe demonstrim për të ndërtuar kuptimin.
{fase_3} = Përforcojmë njohuritë për ${formData.topic} me ushtrime të ndryshme kompleksiteti. Nxënësit argumentojnë zgjidhjet dhe krahasojnë strategjitë. Bëjmë reflektim të shkurtër dhe lidhje me situata praktike.
{n2} = Nxënësi kryen veprime themelore të ${formData.topic} me siguri
{n3} = Nxënësi njehson dhe analizon probleme të ${formData.topic} në situata të ndryshme
{n4} = Nxënësi përdor strategji të avancuara dhe arsyeton zgjidhjet komplekse
{detyra} = Ushtrimi 1 fq.XX | Ushtrimi 2 fq.XX

STRUKTURA HTML (MOS NDRYSHOJ ASNJI KUTI OSE TABELE):




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
                <p style="margin: 0 0 8px 0;"><em>Tema 1:</em> {tema_1}</p>
                <p style="margin: 0 0 8px 0;"><em>Tema 2:</em> {tema_2}</p>
                <p style="margin: 0 0 8px 0;"><em>Situata e parashikuar e të nxënit:</em> {situata}</p>
                <p style="margin: 0 0 6px 0;"><em>Lidhja me fushat e tjera:</em></p>
                <p style="margin: 0 0 8px 0;">{fushat}</p>
                <p style="margin: 0 0 6px 0;"><em>Burimet e informacionit dhe mjetet:</em></p>
                <p style="margin: 0;">{burimet}</p>
            </td>
            <td style="border: 1px solid #000; padding: 10px; width: 60%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><em>Rezultatet e të nxënit të kompetencave: Nxënësi:</em></p>
                <p style="margin: 0;">➢ {kompetenca_1}</p>
                <p style="margin: 0;">➢ {kompetenca_2}</p>
                <p style="margin: 0;">➢ {kompetenca_3}</p>
                <p style="margin: 0;">➢ {kompetenca_4}</p>
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 10px; width: 40%; vertical-align: top;">
                <p style="margin: 0 0 6px 0;"><em>Metodologjia dhe veprimtaritë e nxënësve:</em></p>
                <p style="margin: 0; text-align: center;">{metodologjia}</p>
            </td>
            <td style="border: 1px solid #000; padding: 10px; width: 60%; vertical-align: top;">
                <p style="margin: 0 0 6px 0;"><em>Fjalët kyçe:</em></p>
                <p style="margin: 0;">{fjalet_kyçe}</p>
            </td>
        </tr>
    </table>

    <!-- TABELA 3: Zhvillimi (merged cells) -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none;">
        <tr>
            <td style="border: 1px solid #000; padding: 12px;">
                <p style="margin: 0 0 8px 0;"><strong>— Lidhja e temës me njohuritë e mëparshme:</strong></p>
                <p style="margin: 0 0 12px 0;">{fase_1}</p>
                
                <p style="margin: 0 0 8px 0;"><strong>— Ndërtimi i njohurive:</strong></p>
                <p style="margin: 0 0 12px 0;">{fase_2}</p>
                
                <p style="margin: 0 0 8px 0;"><strong>— Përforcimi i nxënit:</strong></p>
                <p style="margin: 0;">{fase_3}</p>
            </td>
        </tr>
    </table>

    <!-- TABELA 4: Vlerësimi dhe Detyra -->
    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none;">
        <tr>
            <td style="border: 1px solid #000; padding: 12px; width: 65%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><strong>Shenime vlerësuese:</strong></p>
                <p style="margin: 0 0 6px 0;"><strong>N2:</strong> {n2}</p>
                <p style="margin: 0 0 6px 0;"><strong>N3:</strong> {n3}</p>
                <p style="margin: 0;"><strong>N4:</strong> {n4}</p>
            </td>
            <td style="border: 1px solid #000; border-left: 2px solid #000; padding: 12px; width: 35%; vertical-align: top;">
                <p style="margin: 0 0 8px 0;"><strong>Detyra shtëpie:</strong></p>
                <p style="margin: 0;">{detyra}</p>
            </td>
        </tr>
    </table>
</div>

PASTAJ PLOTËSOJI KËTË INFORMACION:
- {tema_1} = ${formData.topic}
- {tema_2} = Vazhdimi i temës mbi {tema_1}
- {situata} = Përshkrim konkret i situatës mësimore praktike
- {fushat} = Shkenca e Natyrës, Gjuhë dhe komunikim, Teknologji, Arte
- {burimet} = Libri i nxënësit, Materiale vizuale, Tabela, Mjete
- {kompetenca_1}, {kompetenca_2}, {kompetenca_3}, {kompetenca_4} = 4 kompetenca specifike për ${formData.topic}
- {fjalet_kyçe} = Fjalë kyçe të temës të ndara me presje
- {metodologjia} = Pyetje-përgjigje, Punë individuale, Punë dyshe, Diskutim
- {fase_1} = 2-3 fjali praktike për "Lidhja e temës me njohuritë e mëparshme"
- {fase_2} = 2-3 fjali praktike për "Ndërtimi i njohurive"
- {fase_3} = 2-3 fjali praktike për "Përforcimi i nxënit"
- {n2}, {n3}, {n4} = Përshkrimet e niveleve të arritjeve (N2, N3, N4)
- {detyra} = Ushtrimi 1 fq.XX | Ushtrimi 2 fq.XX
`;

    // call backend proxy instead of OpenAI directly
    let __id_token_for_server = null;
    try { if (currentUser && typeof currentUser.getIdToken === 'function') __id_token_for_server = await currentUser.getIdToken(); } catch(e) { console.warn('Could not get id token', e); }
    const response = await fetch(window.CONFIG.openai.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': __id_token_for_server ? 'Bearer ' + __id_token_for_server : undefined
        },
        body: JSON.stringify({ prompt: prompt, formData: formData, model: window.CONFIG.openai.model })
    });

    if (!response.ok) {
        let errMsg = 'Gabim në gjenerim';
        try {
            const errJson = await response.json();
            if (response.status === 402) {
                errMsg = 'Kredite të pamjaftueshme. Blini kredite të reja.';
            } else if (errJson?.error) {
                errMsg = errJson.error;
            }
        } catch (e) {}
        throw new Error(errMsg);
    }

    const data = await response.json();
    let generatedContent = data.content || data.html || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';

    // Clean markdown fences if present
    try {
        generatedContent = generatedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    } catch (e) {}

    // Fallback: Fill in any missing placeholders with default values
    const fallbackValues = {
        '{tema_1}': formData.topic || 'Tema e mësimit',
        '{tema_2}': `Vazhdimi i temës: ${formData.topic}`,
        '{situata}': `Situata praktike ku nxënësit zbatojnë konceptet e ${formData.topic} në kontekste reale dhe të përditshme`,
        '{fushat}': formData.fields || 'Shkenca e Natyrës, Gjuhë dhe komunikim, Teknologji, Arte',
        '{burimet}': formData.materials || 'Libri i nxënësit fq.XX-YY, Materiale vizuale, Tabela informuese, Mjete didaktike interaktive',
        '{kompetenca_1}': `Kryen veprime themelore lidhur me ${formData.topic} duke zbatuar procesin e njohurive dhe aftësive`,
        '{kompetenca_2}': `Përcakton konceptet bazë të ${formData.topic} dhe aplikon njohuritë në kontekste të ndryshuara`,
        '{kompetenca_3}': `Njehson dhe analizon problemet komplekse të ${formData.topic} duke përdorur mënyra të ndryshme zgjidhje`,
        '{kompetenca_4}': `Përdor strategji të avancuara të ${formData.topic} dhe arsyeton zgjidhjet komplekse me prova konkrete`,
        '{fjalet_kyçe}': formData.keywords || `${formData.topic}, Koncepte, Vetitë, Llogaritjet, Zbatim praktik, Analiza`,
        '{metodologjia}': 'Pyetje-përgjigje, Punë individuale, Punë dyshe, Diskutim grup, Demonstrim, Eksperiment praktik',
        '{fase_1}': `Aktivizoj dhe ndërtoj mbi njohuritë paraprake të nxënësve rreth ${formData.topic}. Bëj pyetje të thjeshta dhe komplekse për të nxitur mendimin dhe për të kujtuar konceptet bazë. Nxënësit japin shembuj nga përvoja e tyre personale dhe jeta e përditshme. Krijoj diskutim në grup për të lidhur njohuritë e mëparshme me temën e re. Sqaroj termat kryesorë dhe kuptimin e tyre. Prezantoj qëllimin e orës dhe pritjet e rezultateve. Siguroj që të gjithë nxënësit të jenë të motivuar dhe të kuptojnë drejtimin e mësimit.`,
        '{fase_2}': `Prezantoj konceptet e reja të ${formData.topic} hap pas hapi me shembuj të qartë, konkretë dhe të lidhur me jetën reale. Përdor materiale vizuale, grafikë, demonstrime praktike dhe eksperimente kur është e mundur. Nxënësit punojnë fillimisht individualisht me ushtrime të thjeshta, pastaj kalojnë në punë në dyshe për të analizuar hapat e zgjidhjes. Organizoj punë në grupe të vogla për zbatim praktik, diskutim të strategjive dhe zgjidhje të problemeve. Ecën nëpër klasa për të vëzhguar punën, për të dhënë udhëzime dhe për të ndihmuar aty ku është e nevojshme. Ftoj nxënës të shpjegojnë zgjidhjet e tyre dhe të argumentojnë mendimet. Verifikoj përgjigjet, korrigjoj keqkuptimet dhe përforcoj konceptet kryesorë gjatë gjithë procesit.`,
        '{fase_3}': `Përforcoj dhe konsolidoj njohuritë kryesore të ${formData.topic} përmes ushtrimit të vazhdueshëm me ushtrime të shkallëzuara sipas nivelit të vështirësisë. Nxënësit punojnë në dyshe ose grupe me probleme më komplekse që kërkojnë mendim kritik. Ftoj nxënësit të argumentojnë zgjidhjet, të krahasojnë metoda të ndryshme dhe të diskutojnë avantazhet dhe disavantazhet e secilit përqasje. Bëj pyetje të thella për kontroll të kuptimit dhe për të nxitur reflektimin. Përmbledh pikat kyçe të mësimit dhe lidh temën me situata dhe aplikime praktike reale. Jap feedback të menjëhershëm dhe konstruktiv. Vlerësoj njohuritë e fituara dhe përgatit nxënësit për hapat e ardhshëm.`,
        '{n2}': `Nxënësi kryen veprime themelore të ${formData.topic} me siguri duke zbatuar rregullat e mësuara`,
        '{n3}': `Nxënësi njehson dhe analizon probleme të ${formData.topic} në situata të ndryshme duke zbatuar procese zgjidhjeje`,
        '{n4}': `Nxënësi përdor strategji të avancuara të ${formData.topic} dhe arsyeton zgjidhjet komplekse me prova dhe shpjegime të plota`,
        '{detyra}': formData.homework || 'Ushtrimi 1 fq.XX - Përcaktim konceptesh | Ushtrimi 2 fq.YY - Zbatime praktike'
    };

    for (const [placeholder, value] of Object.entries(fallbackValues)) {
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        generatedContent = generatedContent.replace(regex, value);
    }

    // Store data for DOCX template export
    try {
        const templateData = {
            fusha: formData.subject || '',
            lenda: formData.subject || '',
            shkalla: formData.grade || '',
            klasa: formData.grade || '',
            tema_1: fallbackValues['{tema_1}'] || formData.topic || '',
            tema_2: fallbackValues['{tema_2}'] || `Vazhdimi i temës: ${formData.topic}`,
            situata: fallbackValues['{situata}'] || '',
            lidhja: fallbackValues['{fushat}'] || 'Shkenca e Natyrës, Gjuhë dhe komunikim, Teknologji, Arte',
            burimet: fallbackValues['{burimet}'] || '',
            rezultatet: `${fallbackValues['{kompetenca_1}'] || ''}\n${fallbackValues['{kompetenca_2}'] || ''}\n${fallbackValues['{kompetenca_3}'] || ''}\n${fallbackValues['{kompetenca_4}'] || ''}`,
            fjalet_kyce: fallbackValues['{fjalet_kyçe}'] || fallbackValues['{fjalet_kyce}'] || '',
            metodologjia: fallbackValues['{metodologjia}'] || '',
            lidhja_e_temes_me_njohurite_e_tjera: fallbackValues['{fase_1}'] || '',
            ndertimi_i_njohurive: fallbackValues['{fase_2}'] || '',
            perforcimi_i_te_nxenit: fallbackValues['{fase_3}'] || '',
            shenime_vleresuese: `N2: ${fallbackValues['{n2}'] || ''}\nN3: ${fallbackValues['{n3}'] || ''}\nN4: ${fallbackValues['{n4}'] || ''}`,
            detyra_shtepie: fallbackValues['{detyra}'] || ''
        };
        window.lastTemplateData = templateData;
    } catch (e) {
        console.warn('Could not build template data:', e);
    }

    return generatedContent.trim();
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
    
    // Fill form
    document.getElementById('subject').value = item.subject;
    document.getElementById('grade').value = item.grade;
    document.getElementById('topic').value = item.topic;
    document.getElementById('competences').value = item.competences;
    document.getElementById('duration').value = item.duration;
    document.getElementById('lessonDate').value = item.date;
    
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
function blejKredite(sasia) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast('Ju lutem kyçuni për të vazhduar me pagesën.', 'error');
        return;
    }

    const links = {
        10: 'https://buy.stripe.com/test_3cIfZacaT2mX8Ni7Zde3e00',
        20: 'https://buy.stripe.com/test_dRm5kw4Ird1B0gMenBe3e01',
        30: 'https://buy.stripe.com/test_28E8wIa2L1iT4x2frFe3e02',
        50: 'https://buy.stripe.com/test_aFa6oAcaTgdN7Je7Zde3e03'
    };

    const link = links[Number(sasia)];
    if (!link) {
        showToast('Paketa e zgjedhur nuk është valide.', 'error');
        return;
    }

    const url = `${link}?client_reference_id=${encodeURIComponent(user.uid)}`;
    window.location.href = url;
}

window.blejKredite = blejKredite;

document.querySelectorAll('.pricing-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const packageSize = btn.dataset.package;
        blejKredite(packageSize);
    });
});

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
// Logout
// ===================================
logoutBtn.addEventListener('click', () => {
    if (confirm('Jeni i sigurt që doni të dilni?')) {
        logout();
    }
});