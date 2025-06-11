

// template-common.js

window.addEventListener("DOMContentLoaded", () => {
  const user = getUserInfo();
  // Ijinkan akses jika CID atau UID tersedia
  if (!user || (!user.cid && !user.uid)) {
    alert("❌ Akses tidak sah. Silakan login ulang.");
    window.location.href = "/elearn/login-elearning.html";
    return;
  }

  console.log("✅ User info loaded:", user);
  document.body.classList.add("loaded");

  if (typeof setLessonProgress === "function") {
    setLessonProgress();
  }

  if (typeof setupCodeEditor === "function") {
    setupCodeEditor();
  }

  if (typeof setupQuiz === "function") {
    setupQuiz();
  }
});

function getUserInfo() {
  return {
    email: localStorage.getItem("email"),
    role: localStorage.getItem("role"),
    nama: localStorage.getItem("nama"),
    uid: localStorage.getItem("uid"),
    cid: localStorage.getItem("cid")
  };
}