const kelasListEl = document.getElementById("kelas-list");
const detailKelasEl = document.getElementById("detail-kelas");
const modulKelasSection = document.getElementById("modul-kelas");

let currentUserUID = null;
const API_BASE = "https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec";

async function initApp() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUserUID = user.uid;
      fetchJadwalKelas(user.uid);
    } else {
      window.location.href = "/elearn/login-elearning.html";
    }
  });
}

async function fetchJadwalKelas(uid) {
  try {
    const url = `${API_BASE}?tab=EL_JADWAL_KELAS&uid=${encodeURIComponent(uid)}`;
    const res = await fetch(url);
    const data = await res.json();
    kelasListEl.innerHTML = "";

    if (data.length === 0) {
      kelasListEl.innerHTML = "📭 Belum ada jadwal kelas.";
      return;
    }

    data.forEach(kelas => {
      const li = document.createElement("li");
      li.textContent = `${kelas.Hari} - ${kelas.Jam} | ${kelas["Nama Kelas"]}`;
      li.style.cursor = "pointer";
      li.onclick = () => showDetailKelas(kelas);
      kelasListEl.appendChild(li);
    });
  } catch (err) {
    kelasListEl.innerHTML = "❌ Gagal memuat jadwal.";
    console.error("Fetch error:", err);
  }
}

function showDetailKelas(kelas) {
  detailKelasEl.innerHTML = `
    <p><strong>Tanggal:</strong> ${kelas.Tanggal}</p>
    <p><strong>Jam:</strong> ${kelas.Jam}</p>
    <p><strong>Kelas:</strong> ${kelas.Kelas}</p>
    <p><strong>Modul:</strong> ${kelas.Modul}</p>
    <p><strong>Tools:</strong> ${kelas.Tools || '-'}</p>
  `;
  modulKelasSection.style.display = "block";
}

function tutupDetail() {
  modulKelasSection.style.display = "none";
  detailKelasEl.innerHTML = "";
}

function logout() {
  localStorage.clear();
  window.location.href = "/elearn/login-elearning.html";
}

window.onload = initApp;