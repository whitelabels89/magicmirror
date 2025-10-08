function getUserInfo() {
  return {
    email: localStorage.getItem("email"),
    role: localStorage.getItem("role"),
    nama: localStorage.getItem("nama"),
    uid: localStorage.getItem("uid"),
    cid: localStorage.getItem("cid"),
    whatsapp: (function(){
      try {
        return localStorage.getItem("whatsapp") || localStorage.getItem("qa_whatsapp") || sessionStorage.getItem("whatsapp") || '';
      } catch (_){
        return '';
      }
    })()
  };
}