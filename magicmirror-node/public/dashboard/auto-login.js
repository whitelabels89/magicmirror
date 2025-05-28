


let cid;
const urlParams = new URLSearchParams(window.location.search);
const cidFromUrl = urlParams.get("cid");

if (cidFromUrl) {
  cid = cidFromUrl;
  localStorage.setItem("cid", cid);
  localStorage.setItem("cid_login", cid);
  localStorage.setItem("firebase_token", "1");
  console.log("✅ Auto-login via CID link berhasil:", cid);
} else {
  cid = localStorage.getItem("cid");
}

window.cid = cid;