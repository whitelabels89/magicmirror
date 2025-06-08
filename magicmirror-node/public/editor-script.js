window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const classId = params.get('id') || 'default';

  const editor = grapesjs.init({
    container: '#gjs',
    height: '100%',
    storageManager: false,
    blockManager: { appendTo: '#blocks' },
    fromElement: false,
    panels: { defaults: [] }
  });

  const bm = editor.BlockManager;
  bm.add('text', {
    label: 'Teks Modul',
    content: '<div class="text">Edit teks modul...</div>'
  });
  bm.add('image', {
    label: 'Gambar',
    content: '<img src="https://via.placeholder.com/400x200" alt="gambar" />'
  });
  bm.add('video', {
    label: 'Video',
    content: '<div class="video"><iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe></div>'
  });
  bm.add('quiz', {
    label: 'Quiz',
    content: `<div class="quiz">
      <p>Pertanyaan di sini?</p>
      <label><input type="radio" name="q">Jawaban 1</label><br/>
      <label><input type="radio" name="q">Jawaban 2</label><br/>
      <label><input type="radio" name="q">Jawaban 3</label>
    </div>`
  });
  bm.add('lab', {
    label: 'Lab Coding',
    content: '<div class="lab-coding"><textarea>// kode di sini</textarea></div>'
  });

  function saveLayout() {
    const data = {
      html: editor.getHtml(),
      css: editor.getCss()
    };
    localStorage.setItem('layout_kelas_' + classId, JSON.stringify(data));
    alert('Layout disimpan');
  }

  function loadLayout() {
    const raw = localStorage.getItem('layout_kelas_' + classId);
    if (raw) {
      const data = JSON.parse(raw);
      editor.setComponents(data.html);
      editor.setStyle(data.css);
    } else {
      alert('Belum ada layout tersimpan');
    }
  }

  function previewLayout() {
    const html = `<style>${editor.getCss()}</style>${editor.getHtml()}`;
    const w = window.open();
    w.document.write(html);
    w.document.close();
  }

  document.getElementById('save-btn').addEventListener('click', saveLayout);
  document.getElementById('load-btn').addEventListener('click', loadLayout);
  document.getElementById('preview-btn').addEventListener('click', previewLayout);

  // Auto load existing layout on start
  loadLayout();
});
