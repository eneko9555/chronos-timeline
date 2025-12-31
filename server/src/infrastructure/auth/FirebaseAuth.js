const admin = require('firebase-admin');
const AuthProvider = require('../../domain/AuthProvider');

class FirebaseAuth extends AuthProvider {
    constructor() {
        super();
        // Initialize verification-only app if not already initialized
        // NOTE: In production you need service account credentials for full access,
        // but verifyIdToken typically might work or requires simple setup.
        // Ideally, the user should provide GOOGLE_APPLICATION_CREDENTIALS
        if (!admin.apps.length) {
            let serviceAccount = null;
            try {
                if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT !== '{}') {
                    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                }
            } catch (e) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
            }

            if (serviceAccount && serviceAccount.project_id) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } else {
                console.log("Initializing Firebase Admin with explicit Project ID for verification");
                // Use the project ID observed from user's frontend config to enable verification
                admin.initializeApp({
                    projectId: 'timeline-2ccde'
                });
            }
        }
    }

    async verifyToken(idToken) {
        try {
            const decoded = await admin.auth().verifyIdToken(idToken);
            return decoded;
        } catch (e) {
            console.error('Admin SDK verification failed, trying fallback:', e.message);
            // Fallback: Verify via Google's public endpoint (useful for local dev without service account)
            try {
                const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
                if (!response.ok) throw new Error('Fallback validation failed');
                const data = await response.json();

                // Manual checks matching Firebase's logic
                if (data.aud !== 'timeline-2ccde' && data.aud !== 'timeline-2ccde.firebaseapp.com') {
                    throw new Error('Audience mismatch');
                }

                // Map to expected format
                return {
                    uid: data.sub,
                    email: data.email,
                    picture: data.picture,
                    ...data
                };
            } catch (fallbackError) {
                console.error('Fallback verification also failed:', fallbackError);
                throw e; // Throw original error to keep context, or the fallback one
            }
        }
    }
}

module.exports = FirebaseAuth;
