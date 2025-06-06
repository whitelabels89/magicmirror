const firebaseConfig = {
  apiKey: "AIzaSyBVO4ajDwkbcTGL33SVMxIoev4veB8itgI",
  authDomain: "queens-academy-icoding.firebaseapp.com",
  projectId: "queens-academy-icoding",
  storageBucket: "queens-academy-icoding.appspot.com",
  messagingSenderId: "1048549258959",
  appId: "1:1048549258959:web:f8dc1c104bb170d7ff69ba",
  measurementId: "G-RJCXM1YL7E"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
function runWeb(){
  const html = document.getElementById('html').value;
  const css = `<style>${document.getElementById('css').value}</style>`;
  const js = `<script>${document.getElementById('js').value}<\/script>`;
  const iframe = document.getElementById('preview');
  iframe.srcdoc = html + css + js;
}
function saveWeb(){
  const html = document.getElementById('html').value;
  const css = document.getElementById('css').value;
  const js = document.getElementById('js').value;
  if(!html && !css && !js){
    alert('Kode masih kosong!');
    return;
  }
  const data = { html, css, js, created: Date.now() };
  db.collection('karya_anak').add(data);
  fetch('/api/save-karya', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cid: localStorage.getItem('cid') || 'anon',
      judul: 'Web Lab',
      id_karya: 'web_' + Date.now(),
      link: '',
      timestamp: Date.now()
    })
  });
  alert('✅ Disimpan! +10 XP');
}
