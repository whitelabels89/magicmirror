const ANIMALS = {
  kucing: {
    image: "/img/kucing.png",
    legs: '4',
    ciri: ['memiliki kumis', 'suka susu']
  },
  lebah: {
    image: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2072%2072'%3E%0A%20%3Cellipse%20cx%3D'36'%20cy%3D'40'%20rx%3D'20'%20ry%3D'12'%20fill%3D'%23FFD700'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Cline%20x1%3D'22'%20y1%3D'36'%20x2%3D'50'%20y2%3D'36'%20stroke%3D'%23000'%20stroke-width%3D'4'%2F%3E%0A%20%3Cline%20x1%3D'22'%20y1%3D'44'%20x2%3D'50'%20y2%3D'44'%20stroke%3D'%23000'%20stroke-width%3D'4'%2F%3E%0A%20%3Ccircle%20cx%3D'26'%20cy%3D'28'%20r%3D'8'%20fill%3D'%23fff'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Ccircle%20cx%3D'46'%20cy%3D'28'%20r%3D'8'%20fill%3D'%23fff'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%3C%2Fsvg%3E",
    legs: '6',
    ciri: ['menghasilkan madu', 'dapat menyengat']
  },
  bebek: {
    image: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2072%2072'%3E%0A%20%3Ccircle%20cx%3D'36'%20cy%3D'36'%20r%3D'20'%20fill%3D'%23FFD93B'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Crect%20x%3D'36'%20y%3D'30'%20width%3D'16'%20height%3D'8'%20fill%3D'%23FFA500'%20stroke%3D'%23000'%20stroke-width%3D'1'%2F%3E%0A%20%3Ccircle%20cx%3D'28'%20cy%3D'32'%20r%3D'4'%20fill%3D'%23000'%2F%3E%0A%3C%2Fsvg%3E",
    legs: '2',
    ciri: ['bisa berenang', 'mengeluarkan suara kwek']
  },
  siput: {
    image: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2072%2072'%3E%0A%20%3Ccircle%20cx%3D'28'%20cy%3D'44'%20r%3D'12'%20fill%3D'%23B5651D'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Cpath%20d%3D'M40%2044c8%200%2012%208%2012%208h8'%20stroke%3D'%23000'%20stroke-width%3D'4'%20fill%3D'none'%2F%3E%0A%20%3Ccircle%20cx%3D'48'%20cy%3D'32'%20r%3D'4'%20fill%3D'%239C9C9C'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Ccircle%20cx%3D'56'%20cy%3D'32'%20r%3D'4'%20fill%3D'%239C9C9C'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%3C%2Fsvg%3E",
    legs: '0',
    ciri: ['bergerak lambat', 'memiliki cangkang']
  }
};

const workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox')
});

// Hide preview canvas until needed
const previewCanvas = document.getElementById('previewCanvas');
previewCanvas.style.display = 'none';

function drawImage(url) {
  const canvas = document.getElementById('previewCanvas');
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 400, 400);
    ctx.drawImage(img, 50, 50, 200, 200);
  };
  img.src = url;
}

function createBlock(type, fields = {}) {
  const block = workspace.newBlock(type);
  for (const [name, value] of Object.entries(fields)) {
    block.setFieldValue(value, name);
  }
  block.initSvg();
  block.render();
  const metrics = workspace.getMetrics();
  const x = Math.random() * (metrics.viewWidth - 100) + metrics.absoluteLeft;
  const y = Math.random() * (metrics.viewHeight - 100) + metrics.absoluteTop;
  block.moveBy(x, y);
  return block;
}

function init() {
  Object.entries(ANIMALS).forEach(([name, data]) => {
    createBlock('hewan_' + name);
    if (name === 'kucing') {
      createBlock('gambar_kucing');
    } else {
      createBlock('gambar', {SRC: data.image});
    }
    createBlock('kaki', {NUM: data.legs});
    data.ciri.forEach(text => createBlock('ciri', {TEXT: text}));
  });
}

function getCiriTexts(block) {
  const texts = [];
  let b = block.getInputTargetBlock('CIRI');
  while (b) {
    texts.push(b.getFieldValue('TEXT').trim());
    b = b.getNextBlock();
  }
  return texts;
}

function checkAnswer() {
  let correct = true;
  let imageCorrect = true;
  for (const [name, data] of Object.entries(ANIMALS)) {
    const animalBlock = workspace.getBlocksByType('hewan_' + name, false)[0];
    if (!animalBlock) { correct = false; imageCorrect = false; break; }
    const imgBlock = animalBlock.getInputTargetBlock('GAMBAR');
    let url = '';
    if (imgBlock) {
      url = imgBlock.getFieldValue('SRC');
    }
    if (!imgBlock || url.trim() !== data.image || (name === 'kucing' && imgBlock.type !== 'gambar_kucing')) {
      correct = false;
      imageCorrect = false;
    } else {
      drawImage(url);
    }
    const legBlock = animalBlock.getInputTargetBlock('KAKI');
    if (!legBlock || legBlock.getFieldValue('NUM') !== data.legs) {
      correct = false;
    }
    const ciris = getCiriTexts(animalBlock).sort();
    const expected = data.ciri.slice().sort();
    if (ciris.length !== expected.length || ciris.some((c,i) => c !== expected[i])) {
      correct = false;
    }
  }
  const topBlocks = workspace.getTopBlocks(false);
  const allowed = Object.keys(ANIMALS).map(a => 'hewan_' + a);
  if (topBlocks.some(b => !allowed.includes(b.type))) correct = false;
  alert(imageCorrect ? '✅ Gambar benar' : '❌ Gambar salah');
  alert(correct ? '✅ Semua benar!' : '❌ Masih ada yang salah');
}

document.getElementById('check-btn').addEventListener('click', checkAnswer);

init();
