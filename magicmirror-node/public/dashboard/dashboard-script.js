const urlParams = new URLSearchParams(window.location.search);
const cid = urlParams.get("cid");

if (!cid) {
  document.getElementById("loading").innerText = "❌ CID tidak ditemukan di URL.";
} else {
  fetch(`https://script.google.com/macros/s/AKfycbxgh2jsIubO3G-oZgI3Kvkbje6Londv10JxmcXU8drfRYkG28TFcHsOCKZeFq16Azak0g/exec?cid=${cid}`)
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
