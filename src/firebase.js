// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDbzFKKLsXnKkG6Uyc8isZe6ZJIe5i2VHE",
    authDomain: "timeline-2ccde.firebaseapp.com",
    projectId: "timeline-2ccde",
    storageBucket: "timeline-2ccde.firebasestorage.app",
    messagingSenderId: "427560990026",
    appId: "1:427560990026:web:dbe281b4ed7b6679827db3",
    measurementId: "G-NB99M7Z08D"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // No necesitamos analytics por ahora
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
