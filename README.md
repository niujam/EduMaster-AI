EduMaster AI - Local backend & frontend setup

What I changed
- Removed the hard-coded OpenAI API key from the client (`config.js`) and made the frontend call a backend endpoint (`/api/generate`).
- Added a small Express server (`server.js`) that holds the OpenAI API key server-side and proxies requests to OpenAI.
- Updated `app.js` to call the backend endpoint and to send the Firebase ID token (if user is signed in).
- Kept Firebase client-side auth intact. The backend can optionally verify ID tokens and log to Firestore when you provide a Firebase service account.

Files added
- `server.js` - Express proxy for OpenAI. Reads `OPENAI_API_KEY` from `.env` and optionally `FIREBASE_SERVICE_ACCOUNT_PATH` for admin tasks.
- `package.json` - Node dependencies and start script.
- `README.md` - this file.

Setup (local)
1. Install Node dependencies (from project root):

```bash
npm install
```

2. Create a `.env` in the project root (do NOT commit it). Example:

```
OPENAI_API_KEY=sk-...your key...
OPENAI_MODEL=gpt-3.5-turbo
# Optional: path to Firebase service account JSON to allow server to verify id tokens and update Firestore
# FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
PORT=3000
```

3. Run the backend:

```bash
npm start
```

4. Run the frontend by opening `index10.html` or serving the folder with a static server. The frontend will call `/api/generate` relative to the site origin; if your backend runs on a different origin, update `window.CONFIG.openai.endpoint` in `config.js` accordingly (e.g. `https://yourdomain.com/api/generate`).

Security notes
- Rotate the OpenAI API key now that it was found inside this workspace and remove any committed secrets. Do not keep `OPENAI_API_KEY` in `config.js` or other client-side files.
- If you want the backend to verify Firebase users and update Firestore after successful payments/generations, set `FIREBASE_SERVICE_ACCOUNT_PATH` to a service account JSON on the server and ensure it is never committed.

Payments and credits
- The frontend links to Stripe checkout pages. For a robust credits system:
  - Have Stripe call a server webhook (on the server) and let the server update Firestore (requires Firebase admin service account).
  - The frontend currently attempts a best-effort decrement of credits in Firestore after a successful generation; to avoid abuse, implement server-side credit checks/consumption (server verifies user token and decrements in Firestore atomically).

If you want, I can:
- Implement Stripe webhook handling (requires Stripe secret in `.env` and Firebase admin service account).
- Add server-side credit consumption and atomic checks.
- Deploy the backend to a host or Firebase Cloud Functions.

