const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

let app = null;
let auth = null;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    app = getApps().length === 0
      ? initializeApp({
          credential: cert(serviceAccount),
          storageBucket: `${serviceAccount.project_id}.appspot.com`,
        })
      : getApps()[0];

    auth = getAuth(app);
    console.log('✅ Firebase Admin SDK Initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error.message);
  }
} else {
  console.warn('⚠️ Warning: serviceAccountKey.json not found. Firebase Admin features will be disabled.');
}

module.exports = { app, auth };
