import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkCE0wBrsQ1s-7zplvTtWOSE28ISaCFfQ",
  authDomain: "pokesim-7f9b7.firebaseapp.com",
  projectId: "pokesim-7f9b7",
  storageBucket: "pokesim-7f9b7.firebasestorage.app",
  messagingSenderId: "1087100425430",
  appId: "1:1087100425430:web:9558a79ee5330d4a792577",
  measurementId: "G-SPHBPGGX5P"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);