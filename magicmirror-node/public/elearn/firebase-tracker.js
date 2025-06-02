// Firebase App Initialization (Client SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
// No longer importing auth from Firebase

// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBVO4ajDwkbcTGL33SVMxIoev4veB8itgI",
  authDomain: "queens-academy-icoding.firebaseapp.com",
  projectId: "queens-academy-icoding",
  storageBucket: "queens-academy-icoding.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Track Progress
export async function updateProgress(modul, lesson, bagian, status = true) {
  const uid = sessionStorage.getItem("uid_custom");
  if (!uid) return console.error("❌ UID tidak ditemukan di session.");

  const docRef = doc(db, "progress_murid", uid);
  const snapshot = await getDoc(docRef);
  const existingData = snapshot.exists() ? snapshot.data() : {};

  const newData = {
    ...existingData,
    [`${modul}_${lesson}_${bagian}`]: status
  };

  await setDoc(docRef, newData);
  console.log("Progress updated for", uid, modul, lesson, bagian);
}

export async function getProgressFromFirestore(modul, lesson, bagian) {
  const uid = sessionStorage.getItem("uid_custom");
  if (!uid) {
    console.error("❌ UID tidak ditemukan di session.");
    return false;
  }

  const docRef = doc(db, "progress_murid", uid);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    console.warn("📭 Tidak ada data progress di Firestore.");
    return false;
  }

  const data = snapshot.data();
  return data?.[`${modul}_${lesson}_${bagian}`] === true;
}

export async function backupProgressToSheet(progressData) {
  try {
    await fetch("https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progressData)
    });
    console.log("✅ Backup ke Google Sheets sukses");
  } catch (error) {
    console.error("❌ Gagal kirim ke Google Sheets:", error);
  }
}