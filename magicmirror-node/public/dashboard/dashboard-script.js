function getDriveImageUrlFromRaw(rawUrl) {
  try {
    const idMatch = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return idMatch ? `https://drive.google.com/uc?export=view&id=${idMatch[1]}` : rawUrl;
  } catch (err) {
    console.warn("⚠️ Gagal parsing link:", rawUrl, err);
    return rawUrl;
  }
}

const urlParams = new URLSearchParams(window.location.search);
const cid = urlParams.get("cid");

document.getElementById("uploadForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const file = document.getElementById("fileInput").files[0];
  const title = document.getElementById("titleInput").value;

  if (!file || !title || !cid) {
    document.getElementById("uploadStatus").textContent = "❌ Lengkapi semua kolom!";
    return;
  }

  const reader = new FileReader();
  reader.onloadend = async function () {
    const base64Data = reader.result.split(",")[1];

    const payload = {
      cid,
      title,
      filename: file.name,
      mimeType: file.type,
      base64: base64Data,
    };

    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbx5cPx2YQzYLbjMzFJPwIEr_bMsm4VGB8OA-04p33hnuXK61Mm36U04W3IrihbsIDukhw/exec", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "text/plain"
        },
      });

      const result = await res.json();
      document.getElementById("uploadStatus").textContent = result.message || "✅ Berhasil upload!";

      if (result.message && result.message.includes("✅")) {
        location.reload();
      }
    } catch (err) {
      document.getElementById("uploadStatus").textContent = "❌ Gagal upload: " + err;
    }
  };

  reader.readAsDataURL(file);
});

if (!cid) {
  document.getElementById("loading").innerText = "❌ CID tidak ditemukan di URL.";
} else {
  fetch(`https://script.google.com/macros/s/AKfycbx5cPx2YQzYLbjMzFJPwIEr_bMsm4VGB8OA-04p33hnuXK61Mm36U04W3IrihbsIDukhw/exec?cid=${cid}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("loading").style.display = "none";
      document.getElementById("dashboard").style.display = "block";

      document.getElementById("namaAnak").innerText = data.nama || "-";
      document.getElementById("usiaAnak").innerText = `Usia: ${data.usia || "-"}`;
      document.getElementById("tipeBakat").innerText = `🧠 ${data.tipe_bakat || "-"}`;
      document.getElementById("tipeKepribadian").innerText = `🙂 ${data.tipe_kepribadian || "-"}`;
      document.getElementById("kesimpulanAI").innerText = data.kesimpulan || "-";

      const sertifikatEl = document.getElementById("sertifikatContainer");
      if (data.sertifikat && data.sertifikat.includes("drive.google.com")) {
        sertifikatEl.innerHTML = `
          <div style="text-align:center;">
            <iframe src="${data.sertifikat.replace('/view', '/preview')}"
                    width="100%" height="480"
                    style="border:none; border-radius:12px;"
                    allow="autoplay"></iframe>
          </div>`;
      } else {
        sertifikatEl.innerHTML = '<p style="text-align:center;">Tautan sertifikat tidak valid.</p>';
      }

      const evaluasiEl = document.getElementById("evaluasiAI");
      evaluasiEl.innerHTML = "";
      if (data.evaluasi && data.evaluasi.length > 0) {
        data.evaluasi.forEach(e => {
          const p = document.createElement("p");
          p.innerText = `${e.komponen}: ${e.analisis}`;
          evaluasiEl.appendChild(p);
        });
      } else {
        evaluasiEl.innerHTML = "<p>Tidak ada evaluasi ditemukan.</p>";
      }

      const badgeDiv = document.getElementById("badgeList");
      badgeDiv.innerHTML = "";
      if (data.badges && data.badges.length > 0) {
        data.badges.forEach(b => {
          const div = document.createElement("div");
          div.classList.add("badge-item");
          div.innerHTML = `<img src="${b.url}" alt="${b.nama}"/><span>${b.nama}</span>`;
          badgeDiv.appendChild(div);
        });
      } else {
        badgeDiv.innerHTML = "<p>Tidak ada badge ditemukan.</p>";
      }

      const rekomList = document.getElementById("rekomKelas");
      rekomList.innerHTML = "";
      if (data.rekomendasi && data.rekomendasi.length > 0) {
        data.rekomendasi.forEach(r => {
          const li = document.createElement("li");
          li.innerText = r;
          rekomList.appendChild(li);
        });
      } else {
        rekomList.innerHTML = "<li>Tidak ada rekomendasi kelas.</li>";
      }

      const galeri = document.getElementById("galeri");
      galeri.innerHTML = "";
      if (data.karya && data.karya.length > 0) {
        data.karya.forEach(k => {
          if (k.url && k.url.includes("http")) {
            const wrapper = document.createElement("div");
            wrapper.style.display = "inline-block";
            wrapper.style.margin = "10px";
            wrapper.style.textAlign = "center";

            const img = document.createElement("img");
            img.src = getDriveImageUrlFromRaw(k.url);
            img.alt = k.judul || "Karya anak";
            img.style.maxWidth = "200px";
            img.style.borderRadius = "8px";

            const caption = document.createElement("p");
            caption.innerText = k.judul || "";
            caption.style.fontSize = "0.9rem";
            caption.style.marginTop = "0.5rem";

            wrapper.appendChild(img);
            wrapper.appendChild(caption);
            galeri.appendChild(wrapper);
          }
        });
      } else {
        galeri.innerHTML = "<p>Belum ada karya yang diunggah.</p>";
      }
    })
    .catch(err => {
      document.getElementById("loading").innerText = "❌ Gagal memuat data.";
      console.error(err);
    });
}
