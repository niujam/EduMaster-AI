require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');

const app = express();
app.use(cors({ 
  origin: [
    'http://localhost:3000', 
    'http://localhost:8080', 
    'http://127.0.0.1:8080', 
    'http://127.0.0.1:3000', 
    'http://127.0.0.1:5500', 
    'http://localhost:5500',
    'https://edumaster-ai.onrender.com',
    'file://'
  ],
  credentials: true
}));
app.get('/', (req, res) => {res.sendFile(path.join(__dirname,'index10.html'));});
app.use(express.static(__dirname));

// Serve success.html for /success route
app.get('/success', (req, res) => {res.sendFile(path.join(__dirname,'success.html'));});

// Serve privacy.html for /privacy route
app.get('/privacy', (req, res) => {res.sendFile(path.join(__dirname,'privacy.html'));});

// Serve terms.html for /terms route
app.get('/terms', (req, res) => {res.sendFile(path.join(__dirname,'terms.html'));});

// Stripe Webhook requires raw body, so we register it before JSON parsing
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Create Checkout Session for Payment
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
    if (!idToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let uid = null;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { packageSize, userId } = req.body;

    // Validate package size
    const priceMap = {
      10: 399,   // €3.99
      20: 699,   // €6.99
      30: 899,   // €8.99
      50: 1299   // €12.99
    };

    const creditsMap = {
      10: 10,
      20: 20,
      30: 30,
      50: 50
    };

    if (!priceMap[packageSize] || !creditsMap[packageSize]) {
      return res.status(400).json({ error: 'Invalid package size' });
    }

    let price = priceMap[packageSize];

    // Check for active promo in Firestore
    if (admin && firebaseInitialized) {
      try {
        const db = admin.firestore();
        const promoDoc = await db.collection('settings').doc('promo_config').get();
        
        if (promoDoc.exists) {
          const promoData = promoDoc.data();
          if (promoData.is_active && promoData.discount_percent) {
            const discountAmount = Math.round(price * (promoData.discount_percent / 100));
            price = price - discountAmount;
            console.log(`✅ Applied promo: ${promoData.discount_percent}% off. New price: €${(price / 100).toFixed(2)}`);
          }
        }
      } catch (e) {
        console.warn('Could not fetch promo config:', e.message);
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${packageSize} Kredite - EduMaster AI`,
              description: `${creditsMap[packageSize]} kredite për gjenerimin e diarëve`
            },
            unit_amount: price
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.BASE_URL || 'https://edumaster-ai.onrender.com'}/success`,
      cancel_url: `${process.env.BASE_URL || 'https://edumaster-ai.onrender.com'}/pricing`,
      metadata: {
        user_id: uid,
        credits: creditsMap[packageSize]
      }
    });

    console.log(`✅ Checkout session created for user ${uid}: ${session.id}`);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Create session error:', error?.message || error);
    res.status(500).json({ error: 'Failed to create checkout session', detail: error?.message });
  }
});

// Stripe Webhook for Payment Success
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!stripe || !stripeWebhookSecret) {
      return res.status(500).send('Stripe not configured');
    }

    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error('❌ Stripe webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session?.metadata?.user_id;

      if (!uid) {
        console.error('❌ Missing metadata.user_id in session');
        return res.status(400).send('Missing metadata.user_id');
      }

      if (!firebaseInitialized) {
        console.error('❌ Firebase not initialized');
        return res.status(500).send('Firebase not available');
      }

      // Retrieve session with line items to get lookup_key
      const sessionWithItems = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items.data.price']
      });

      const lineItem = sessionWithItems.line_items?.data?.[0];
      const lookupKey = lineItem?.price?.lookup_key;

      const creditsMap = {
        paketa_10: 10,
        paketa_20: 20,
        paketa_30: 30,
        paketa_50: 50
      };

      const creditsToAdd = creditsMap[lookupKey];
      if (!creditsToAdd) {
        console.error('❌ Unknown lookup_key:', lookupKey);
        return res.status(400).send('Unknown package');
      }

      const db = admin.firestore();
      await db.collection('users').doc(uid).update({
        credits: admin.firestore.FieldValue.increment(creditsToAdd)
      });

      console.log(`✅ Added ${creditsToAdd} credits to user ${uid}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('❌ Stripe webhook error:', err.message || err);
    res.status(500).send('Webhook handler error');
  }
});

app.use(bodyParser.json({ limit: '1mb' }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set in environment. Set it in .env for server to work.');
}
const client = new OpenAI({ apiKey: OPENAI_API_KEY });

// Optional Firebase admin initialization for token verification and Firestore updates.
let admin = null;
let firebaseInitialized = false;
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (serviceAccountJSON || fs.existsSync(serviceAccountPath)) {
    admin = require('firebase-admin');
    const serviceAccount = serviceAccountJSON 
        ? JSON.parse(serviceAccountJSON) 
        : require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    firebaseInitialized = true;
    console.log('✅ Firebase admin initialized.');
} else {
    console.log('⚠️ Firebase service account key not found. Running in demo mode.');
}

} catch (e) {
  console.log('⚠️  Firebase initialization skipped (demo mode):', e.message);
}

function buildPromptFromForm(formData) {
  // Build a concise but specific prompt similar to the frontend version.
  return `Je një mësues ekspert. Gjenero ditarin VETËM si kod HTML, pa tekst hyrës.\n
RREGULLAT E STRUKTURËS (E RËNDËSISHME):\n1. Zhvillimi i mësimit: Krijo NJË rresht të vetëm të madh (<td colspan=\"4\">) për të gjithë zhvillimin. Brenda tij, shkruaj tre titujt: \"Lidhja e temës me njohuritë e mëparshme\", \"Ndërtimi i njohurive\" dhe \"Përforcimi i nxënësit\". MOS vendos vija tabelare (border) midis këtyre tre titujve, përdor vetëm hapësirë ose viza të thjeshta horizontale <hr>.\n\nShtoni informacion të qartë për: tema, rezultatet, metodologjinë (grupe/dyshe/individual), fjalët kyçe (si listë, të ndarë me presje), burimet, dhe 3 kompetenca.\n\nPërdor strukturë HTML si më poshtë: (mbusheni vetëm pjesët në kllapa [])\n\nLënda: ${formData?.subject || ''}\nKlasa: ${formData?.grade || ''}\nTema: ${formData?.topic || ''}\nKompetencat (burim): ${formData?.competences || ''}\nKohëzgjatja: ${formData?.duration || ''}\nData: ${formData?.date || ''}\n\nGjenero HTML të pastër dhe profesional.`;
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate', async (req, res) => {
  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
    console.log('📨 Generate request received. Token present:', !!idToken, 'Firebase init:', firebaseInitialized);
    
    let uid = null;
    
    // Verify Firebase ID token (required)
    if (!idToken || !firebaseInitialized) {
      console.log('❌ Missing token or Firebase not init');
      return res.status(401).json({ error: 'Unauthorized: no token or Firebase not available' });
    }
    
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
      console.log('✅ Token verified for user:', uid);
    } catch (e) {
      console.warn('❌ Invalid ID token:', e.message || e);
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    // Check user credits in Firestore before generating
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const credits = userDoc.exists ? (userDoc.data().credits || 0) : 0;
    const creditCost = 1;
    
    console.log(`💳 User ${uid} has ${credits} credits, need ${creditCost}`);
    
    if (credits < creditCost) {
      console.log(`❌ Insufficient credits for user ${uid}`);
      return res.status(402).json({ error: 'Insufficient credits', available: credits, required: creditCost });
    }

    const { formData, prompt: clientPrompt, photos } = req.body || {};
    const usedModel = OPENAI_MODEL;
    const isMultipleThemes = formData?.isMultipleThemes || false;

    // Use client-provided prompt if available, otherwise build from formData
    let prompt = clientPrompt || buildPromptFromForm(formData || {});
    
    // Modify prompt if multi-theme lesson is selected
    if (isMultipleThemes) {
      console.log('🎨 Multi-theme lesson detected - modifying prompt...');
      prompt += '\n\nNOTA SPECIALE: Ky ditar duhet të integrojë të gjitha faqet e librit në një diari të vetëm. Përfshi tema të ndryshme por me koherencë të lartë.';
    }

    // Build message content with photos if provided
    let messageContent = prompt;
    if (photos && Array.isArray(photos) && photos.length > 0) {
      console.log(`📸 Processing ${photos.length} photos for vision analysis...`);
      
      // Build content array for multimodal request
      messageContent = [
        {
          type: "text",
          text: prompt
        }
      ];
      
      // Add images to content
      photos.forEach((photo, index) => {
        if (photo && photo.base64) {
          let base64Str = photo.base64;
          // Remove data:image/...;base64, prefix if present
          if (base64Str.includes(',')) {
            base64Str = base64Str.split(',')[1];
          }
          
          messageContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Str}`
            }
          });
          console.log(`✅ Photo ${index + 1} added to vision analysis`);
        }
      });
    }

    const openaiResp = await client.chat.completions.create({
      model: usedModel,
      messages: [
        { role: 'system', content: 'Ti je një asistent që plotëson ditarë shkollorë. Të janë dhënë deri në 10 foto të faqeve të librit. Shikoje përmbajtjen sipas radhës. Nëse dallon që fotot kalojnë nga një temë mësimi në një tjetër, integrojini ato në mënyrë organike në ditarin final, duke përfshirë objektivat dhe kompetencat për të gjithë materialin e paraqitur. Përgjigju VETËM në formatin JSON që të përputhet me template-in.' },
        { role: 'user', content: messageContent }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const text = openaiResp?.choices?.[0]?.message?.content || '';

    // Atomically decrement credits and log generation in Firestore
    try {
      await userRef.update({
        credits: admin.firestore.FieldValue.increment(-creditCost),
        totalGenerated: admin.firestore.FieldValue.increment(1),
        lastGeneration: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Credits decremented for user ${uid}`);
    } catch (e) {
      console.warn('Could not update credits in Firestore:', e.message || e);
    }

    res.json({ content: text });
  } catch (err) {
    console.error('Generation error:', err?.message || err);
    res.status(500).json({ error: 'Generation failed', detail: (err?.message || String(err)) });
  }
});

app.post('/api/render-docx', async (req, res) => {
  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
    console.log('📨 Render DOCX request received. Token present:', !!idToken, 'Firebase init:', firebaseInitialized);

    let uid = null;

    if (!idToken || !firebaseInitialized) {
      console.log('❌ Missing token or Firebase not init');
      return res.status(401).json({ error: 'Unauthorized: no token or Firebase not available' });
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
      console.log('✅ Token verified for user:', uid);
    } catch (e) {
      console.warn('❌ Invalid ID token:', e.message || e);
      return res.status(401).json({ error: 'Unauthorized: invalid token' });
    }

    const data = (req.body && req.body.data) || null;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid template data' });
    }

    const templatePath = process.env.DOCX_TEMPLATE_PATH || path.join(__dirname, 'shabllon.docx');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: 'Template file not found on server' });
    }

    try {
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);

      // Replace placeholders in document.xml using simple text replacement
      if (zip.files['word/document.xml']) {
        let docContent = zip.files['word/document.xml'].asText();

        // Replace each placeholder - support both {{name}} and [NAME] formats
        for (const [key, value] of Object.entries(data)) {
          const textValue = String(value || '');
          
          // Replace {{key}} format
          docContent = docContent.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), textValue);
          
          // Replace [KEY] format (uppercase)
          docContent = docContent.replace(new RegExp(`\\[\\s*${key.toUpperCase()}\\s*\\]`, 'g'), textValue);
        }

        zip.file('word/document.xml', docContent);
      }

      const buf = zip.generate({ type: 'nodebuffer' });

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="Ditar.docx"'
      });
      console.log('✅ DOCX rendered successfully');
      return res.send(buf);
    } catch (error) {
      console.error('DOCX render error:', error?.message || error);
      return res.status(400).json({ error: 'Template rendering failed', detail: error?.message || String(error) });
    }
  } catch (err) {
    console.error('Render DOCX error:', err?.message || err);
    res.status(500).json({ error: 'Render DOCX failed', detail: (err?.message || String(err)) });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
