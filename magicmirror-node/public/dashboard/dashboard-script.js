const urlParams = new URLSearchParams(window.location.search);
const cid = urlParams.get("cid");

// Event listener for upload form
document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const file = document.getElementById("fileInput").files[0];
  const title = document.getElementById("titleInput").value;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("cid", cid);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "https://script.google.com/macros/s/AKfycbw5WV6yxFX6nnVsNoXeJYrQ4PqqF9R51jV8v6KCb3om_4cILIm8v0dr_D0YsPC0BuBkAA/exec", true);

  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        const response = JSON.parse(xhr.responseText);
        document.getElementById("uploadStatus").textContent = response.message;
      } catch (err) {
        document.getElementById("uploadStatus").textContent = "❌ Gagal parsing respons server.";
      }
    } else {
      document.getElementById("uploadStatus").textContent = "❌ Gagal upload (status " + xhr.status + ")";
    }
  };

  xhr.onerror = function () {
    document.getElementById("uploadStatus").textContent = "❌ Gagal upload (network error)";
  };

  xhr.send(formData);
});

if (!cid) {
  document.getElementById("loading").innerText = "❌ CID tidak ditemukan di URL.";
} else {
  fetch(`https://script.google.com/macros/s/AKfycbw5WV6yxFX6nnVsNoXeJYrQ4PqqF9R51jV8v6KCb3om_4cILIm8v0dr_D0YsPC0BuBkAA/exec?cid=${cid}`)
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
