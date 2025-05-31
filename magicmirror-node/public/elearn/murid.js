const API_URL = "https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec?tab=PROFILE_ANAK";

window.onload = async () => {
  const cid = localStorage.getItem("CID");
  if (!cid) {
    alert("❌ CID tidak ditemukan. Silakan login ulang.");
    window.location.href = "/elearn/login-elearning.html";
    return;
  }

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const murid = data.find(row => row.CID === cid);
    if (!murid) {
      alert("❌ Data murid tidak ditemukan.");
      return;
    }

    // Simpan kembali ke localStorage jika perlu
    localStorage.setItem("CID", murid.CID);
    localStorage.setItem("Nama", murid["Nama Anak"]);
    localStorage.setItem("Coin", murid.Coin || 0);
    localStorage.setItem("Badge", murid.Badge || 0);

    // Render ke HTML
    document.querySelector(".header h1").innerHTML = `Halo, ${murid["Nama Anak"]}! 👋`;
    document.querySelector(".status-box").innerHTML = `
      <div>⭐ Coin: ${murid.Coin || 0}</div>
      <div>🏅 Badge: ${murid.Badge || 0}</div>
    `;

    // Render lesson dinamis
    const lessonContainer = document.querySelector(".lesson-container");
    if (lessonContainer && murid.Lesson && Array.isArray(murid.Lesson)) {
      lessonContainer.innerHTML = "";

      murid.Lesson.forEach((lesson, i) => {
        const div = document.createElement("div");
        div.className = "lesson-card";
        div.innerHTML = `
          <div class="lesson-header" onclick="toggleLessonDetail('lesson-${i}')">
            <h3>📘 Modul ${i + 1}: ${lesson.Modul}</h3>
            <p>📍 Status: ${lesson.Status}</p>
          </div>
          <div id="lesson-${i}" class="lesson-detail" style="display:none;">
            <ul>
              ${lesson.Task.map(task => `<li>✅ ${task}</li>`).join("")}
            </ul>
          </div>
        `;
        lessonContainer.appendChild(div);
      });
    } else {
      console.warn("📭 Data lesson kosong atau format tidak sesuai.");
    }

    // Tambahkan fungsi toggleLessonDetail
    window.toggleLessonDetail = function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = el.style.display === "none" ? "block" : "none";
      }
    };
  } catch (err) {
    console.error("❌ Gagal ambil data murid:", err);
  }
};