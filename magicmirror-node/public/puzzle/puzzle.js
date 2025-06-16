const ANIMALS = {
  kucing: {
    image: 'https://twemoji.maxcdn.com/v/latest/72x72/1f408.png',
    legs: '4',
    ciri: ['memiliki kumis', 'suka susu']
  },
  lebah: {
    image: 'https://twemoji.maxcdn.com/v/latest/72x72/1f41d.png',
    legs: '6',
    ciri: ['menghasilkan madu', 'dapat menyengat']
  },
  bebek: {
    image: 'https://twemoji.maxcdn.com/v/latest/72x72/1f986.png',
    legs: '2',
    ciri: ['bisa berenang', 'mengeluarkan suara kwek']
  },
  siput: {
    image: 'https://twemoji.maxcdn.com/v/latest/72x72/1f40c.png',
    legs: '0',
    ciri: ['bergerak lambat', 'memiliki cangkang']
  }
};

const workspace = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox')
});

function drawImage(url) {
  const ctx = document.getElementById('previewCanvas').getContext('2d');
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
    createBlock('gambar', {SRC: data.image});
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
    const url = imgBlock ? imgBlock.getFieldValue('SRC').trim() : '';
    if (!imgBlock || url !== data.image) {
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
