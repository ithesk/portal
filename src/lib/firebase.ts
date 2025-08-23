
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCptCTP7xDmJkvWdMJ1HrHZ4m_qL35KxEg",
  authDomain: "equipotrack-qdywm.firebaseapp.com",
  projectId: "equipotrack-qdywm",
  storageBucket: "equipotrack-qdywm.firebasestorage.app",
  messagingSenderId: "112084576784",
  appId: "1:112084576784:web:f259df9a36afe62f227895"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, "alzadatos");
const auth = getAuth(app);

export { db, auth };
