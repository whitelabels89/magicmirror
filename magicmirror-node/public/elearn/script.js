const GAS_URL = "https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec";

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("error-message");

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Fetch user profile from GAS sheet
    const res = await fetch(`${GAS_URL}?email=${encodeURIComponent(email)}`);
    const data = await res.json();

    const role = data.Role?.toString().trim().toLowerCase();

    if (!role) {
      errorEl.textContent = "❌ Akun tidak dikenali dalam sistem.";
      return;
    }

    if (role === "guru") {
      window.location.href = "/elearn/guru.html";
    } else if (role === "anak") {
      window.location.href = "/elearn/murid.html";
    } else if (role === "ortu") {
      window.location.href = "/elearn/ortu.html";
    } else {
      errorEl.textContent = "❌ Role tidak dikenali: " + role;
    }

  } catch (error) {
    console.error("Login error:", error);
    errorEl.textContent = "❌ " + error.message;
  }
}
