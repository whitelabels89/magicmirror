

// template-common.js

window.addEventListener("DOMContentLoaded", () => {
  const user = getUserInfo();
  if (!user || user.role !== "anak") {
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
    email: sessionStorage.getItem("email"),
    role: sessionStorage.getItem("role"),
    nama: sessionStorage.getItem("nama"),
    uid: sessionStorage.getItem("uid_custom")
  };
}