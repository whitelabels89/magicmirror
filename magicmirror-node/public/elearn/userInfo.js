

function getUserInfo() {
  return {
    email: sessionStorage.getItem("email"),
    role: sessionStorage.getItem("role"),
    nama: sessionStorage.getItem("nama"),
    uid: sessionStorage.getItem("uid")
  };
}