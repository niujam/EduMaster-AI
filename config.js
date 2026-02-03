// ===================================
// Firebase Configuration
// ===================================
const firebaseConfig = {
    apiKey: "AIzaSyDB2IDsiTz4Dyl_U_7DGNzIkEEBuasjmps",
    authDomain: "edumaster-ai-e94cf.firebaseapp.com",
    projectId: "edumaster-ai-e94cf",
    storageBucket: "edumaster-ai-e94cf.firebasestorage.app",
    messagingSenderId: "571747069823",
    appId: "1:571747069823:web:2381971d28e170a119744a"
};

// ===================================
// OpenAI API Configuration (DO NOT PUT SECRET KEYS IN CLIENT)
// ===================================
// Auto-detect API endpoint: use ngrok if available, otherwise localhost
const getApiBaseUrl = () => {
    // If running on ngrok domain, replace with https and use /api routes
    if (window.location.hostname.includes('ngrok')) {
        return `https://${window.location.hostname}`;
    }
    // Local development
    return ``;
};
const API_BASE_URL = getApiBaseUrl();
const OPENAI_API_ENDPOINT = `${API_BASE_URL}/api/generate`;
const OPENAI_MODEL = "gpt-4o";

// ===================================
// DOCX Template Export Endpoint
// ===================================
const DOCX_TEMPLATE_ENDPOINT = `${API_BASE_URL}/api/render-docx`;

// ===================================
// Stripe Configuration
// ===================================
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51SvphD494v5RvxILyEGNNc3C7nPzYkKLJXUfPaYjdBUVe90mgdJJHZnobJgBKPUHKJEHC4aTDvBJCZHqV0Vtc8k500sS1gzbDl';

// ===================================
// Stripe Payment Links (Shto linqet tuaja)
// ===================================
const STRIPE_PAYMENT_LINKS = {
    10: "https://buy.stripe.com/your-link-for-10-credits",
    20: "https://buy.stripe.com/your-link-for-20-credits",
    30: "https://buy.stripe.com/your-link-for-30-credits",
    50: "https://buy.stripe.com/your-link-for-50-credits"
};

// ===================================
// App Constants
// ===================================
const FREE_CREDITS = 5; // Kredite falas për përdorues të ri
const CREDIT_PER_GENERATION = 1; // Sa kredite kushton një gjenerim

// Export configurations
window.CONFIG = {
    firebase: firebaseConfig,
    openai: {
        endpoint: OPENAI_API_ENDPOINT,
        model: OPENAI_MODEL
    },
    docx: {
        endpoint: DOCX_TEMPLATE_ENDPOINT
    },
    stripe: STRIPE_PAYMENT_LINKS,
    credits: {
        free: FREE_CREDITS,
        perGeneration: CREDIT_PER_GENERATION
    }
};