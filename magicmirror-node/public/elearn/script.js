const GAS_URL = "https://script.google.com/macros/s/AKfycbynFv8gTnczc7abTL5Olq_sKmf1e0y6w9z_KBTKETK8i6NaGd941Cna4QVnoujoCsMdvA/exec";

async function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("password").value.trim();
  const errorEl = document.getElementById("error-message");

  if (!email || !pass) {
    errorEl.innerText = "❗ Email dan password harus diisi.";
    return;
  }

  try {
    const userCred = await firebase.auth().signInWithEmailAndPassword(email, pass);
    const uid = userCred.user.uid;
    const idToken = await userCred.user.getIdToken();

    // Ambil info role dan data lain dari Firestore
    const res = await fetch(`https://firebase-upload-backend.onrender.com/api/get-role-by-uid?uid=${uid}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + idToken
      }
    });
    const data = await res.json();

    console.log('Fetched role data:', data);

    if (data.error) {
      errorEl.innerText = "❌ " + data.error;
      return;
    }
    if (!data.role) {
      errorEl.innerText = "❌ Role tidak ditemukan. Hubungi admin.";
      return;
    }

    // Simpan ke localStorage
    localStorage.setItem("uid", uid);
    localStorage.setItem("cid", data.cid || "");
    localStorage.setItem("role", data.role);
    localStorage.setItem("nama", data.nama || "");
    localStorage.setItem("email", email);

    // Redirect berdasarkan role
    if (data.role === "murid") {
      window.location.href = "/elearn/murid.html";
    } else if (data.role === "guru") {
      window.location.href = "/elearn/guru.html";
    } else if (data.role === "ortu") {
      window.location.href = "/elearn/ortu.html";
    } else if (data.role === "moderator") {
      window.location.href = "/mod/moderator.html";
    } else {
      errorEl.innerText = "❌ Role tidak dikenali.";
    }

  } catch (err) {
    console.error("Login error:", err);
    errorEl.innerText = "❌ Gagal login: " + err.message;
  }
}

function logout() {
  firebase.auth().signOut().then(() => {
    sessionStorage.clear();
    window.location.href = "/elearn/login-elearning.html";
  }).catch((error) => {
    alert("❌ Gagal logout. Coba ulangi.");
  });
}
