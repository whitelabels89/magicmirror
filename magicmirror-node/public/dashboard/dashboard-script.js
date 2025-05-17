const urlParams = new URLSearchParams(window.location.search);
const cid = urlParams.get("cid");

// Event listener for upload form
document.getElementById("uploadForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const file = document.getElementById("fileInput").files[0];
  const title = document.getElementById("titleInput").value;
  const cid = new URLSearchParams(window.location.search).get("cid");

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
        const newImg = document.createElement("img");
        newImg.src = "https://drive.google.com/uc?export=view&id=" + extractFileIdFromUrl(result.message);
        newImg.style.width = "150px";
        newImg.style.margin = "10px";
        document.getElementById("galeri").appendChild(newImg);

        document.getElementById("fileInput").value = "";
        document.getElementById("titleInput").value = "";
      }

      function extractFileIdFromUrl(msg) {
        const match = msg.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : "";
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

      document.getElementById("namaAnak").innerText = data.nama;
      document.getElementById("usiaAnak").innerText = `Usia: ${data.usia} tahun`;
      document.getElementById("sertifikatLink").href = data.sertifikat;

      document.getElementById("tipeBakat").innerText = `🧠 ${data.tipe_bakat}`;
      document.getElementById("tipeKepribadian").innerText = `🙂 ${data.tipe_kepribadian}`;

      const badgeDiv = document.getElementById("badgeList");
      data.badges.forEach(b => {
        const img = document.createElement("img");
        img.src = b.url;
        img.alt = b.nama;
        img.title = b.nama;
        img.style.width = "60px";
        img.style.marginRight = "10px";
        badgeDiv.appendChild(img);
      });

      const kelasList = document.getElementById("rekomKelas");
      data.rekomendasi.forEach(k => {
        const li = document.createElement("li");
        li.innerText = k;
        kelasList.appendChild(li);
      });

      const galeri = document.getElementById("galeri");
      data.karya.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.style.width = "150px";
        img.style.margin = "10px";
        galeri.appendChild(img);
      });
    })
    .catch(err => {
      document.getElementById("loading").innerText = "❌ Gagal memuat data.";
      console.error(err);
    });
}
