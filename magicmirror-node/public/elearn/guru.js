const kelasListEl = document.getElementById("kelas-list");
const detailKelasEl = document.getElementById("detail-kelas");
const modulKelasSection = document.getElementById("modul-kelas");

let currentUserUID = null;

// Ganti dengan URL Web App kamu yang aktif
const API_BASE = "https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec";

async function initApp() {
  if (!firebase || !firebase.auth) {
    console.error("❌ Firebase belum dimuat. Pastikan library Firebase disertakan di HTML.");
    return;
  }

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
      const jam = new Date(kelas.Jam).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      });
      li.textContent = `${kelas.Hari} - ${jam} | ${kelas["Nama Kelas"]}`;
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
    <p><strong>Hari:</strong> ${kelas.Hari || '-'}</p>
    <p><strong>Jam:</strong> ${kelas.Jam ? new Date(kelas.Jam).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : '-'}</p>
    <p><strong>Nama Kelas:</strong> ${kelas["Nama Kelas"] || '-'}</p>
    <p><strong>Link Meet:</strong> ${kelas["Link Meet"] ? `<a href="${kelas["Link Meet"]}" target="_blank">Join</a>` : '-'}</p>
    <p><strong>Status:</strong> ${kelas.Status || '-'}</p>
  `;
  modulKelasSection.style.display = "block";
}

function tutupDetail() {
  modulKelasSection.style.display = "none";
  detailKelasEl.innerHTML = "";
}

function logout() {
  firebase.auth().signOut().then(() => {
    localStorage.clear();
    window.location.href = "/elearn/login-elearning.html";
  });
}

window.onload = initApp;
