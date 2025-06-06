const firebaseConfig = { /* your firebase config */ };
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
  const data = {
    html: document.getElementById('html').value,
    css: document.getElementById('css').value,
    js: document.getElementById('js').value,
    created: Date.now()
  };
  db.collection('karya_anak').add(data);
  alert('✅ Disimpan!');
}
