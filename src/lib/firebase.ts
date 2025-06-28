// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1W8CoSHsUbEIlHR8RNNeMAO8K-azj8QE",
  authDomain: "fiche-6c643.firebaseapp.com",
  databaseURL: "https://fiche-6c643-default-rtdb.firebaseio.com",
  projectId: "fiche-6c643",
  storageBucket: "fiche-6c643.appspot.com",
  messagingSenderId: "251608975794",
  appId: "1:251608975794:web:095ff8f083d43553663cab",
  measurementId: "G-GT622QLZCR"
};

// Initialize Firebase for SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

    