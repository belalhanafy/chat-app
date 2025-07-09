// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "react-chat-app-9f0f1.firebaseapp.com",
  projectId: "react-chat-app-9f0f1",
  storageBucket: "react-chat-app-9f0f1.firebasestorage.app",
  messagingSenderId: "585859428080",
  appId: "1:585859428080:web:d0c5ea0a7373e4a7389c35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);



// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);


// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);