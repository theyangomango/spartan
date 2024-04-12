// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5sgHX4P3OD2XqFAT6WhWFvilCVu-DuUQ",
    authDomain: "spartan-8a55f.firebaseapp.com",
    projectId: "spartan-8a55f",
    storageBucket: "spartan-8a55f.appspot.com",
    messagingSenderId: "962581589411",
    appId: "1:962581589411:web:df0958f4b1149542bf3e16"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);