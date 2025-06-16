const ANIMALS = {
  kucing: {
    image: "/img/kucing.png",
    legs: '4',
    ciri: ['memiliki kumis', 'suka susu']
  },
  lebah: {
    image: "/img/lebah.png",
    legs: '6',
    ciri: ['menghasilkan madu', 'dapat menyengat']
  },
  bebek: {
    image: "/img/bebek.png",
    legs: '2',
    ciri: ['bisa berenang', 'mengeluarkan suara kwek']
  },
  kura: {
    image: "/img/kura.png",
    legs: '4',
    ciri: ['bergerak lambat', 'memiliki cangkang']
  }
};

const workspace = Blockly.inject('blocklyDiv', {
  toolbox: null,
  zoom: {
    controls: true,
    wheel: true,
    startScale: 0.8,
    maxScale: 2,
    minScale: 0.3,
    scaleSpeed: 1.2
  },
  move: {
    scrollbars: true,
    drag: true,
    wheel: true
  }
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
    createBlock('gambar_' + name);
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
  let firstIncorrectBlock = null;

  // Helper function to add blinking red border to a block's SVG group
  function blinkBlock(block) {
    const svgRoot = block.getSvgRoot();
    if (!svgRoot) return;
    svgRoot.classList.add('blink-red');
    setTimeout(() => {
      svgRoot.classList.remove('blink-red');
    }, 3000); // duration should match animation duration * iterations
  }

  for (const [name, data] of Object.entries(ANIMALS)) {
    const animalBlock = workspace.getBlocksByType('hewan_' + name, false)[0];
    if (!animalBlock) {
      correct = false;
      imageCorrect = false;
      if (!firstIncorrectBlock) firstIncorrectBlock = null; // no block to draw image from
      continue;
    }
    const imgBlock = animalBlock.getInputTargetBlock('GAMBAR');
    let url = '';
    let imgCorrect = false;
    if (imgBlock) {
      url = imgBlock.getFieldValue('SRC');
      imgCorrect = (url.trim() === data.image && imgBlock.type === 'gambar_' + name);
    }
    if (!imgBlock || !imgCorrect) {
      correct = false;
      imageCorrect = false;
      if (!firstIncorrectBlock) firstIncorrectBlock = animalBlock;
      blinkBlock(animalBlock);
    }
    const legBlock = animalBlock.getInputTargetBlock('KAKI');
    if (!legBlock || legBlock.getFieldValue('NUM') !== data.legs) {
      correct = false;
      if (!firstIncorrectBlock) firstIncorrectBlock = animalBlock;
      blinkBlock(animalBlock);
    }
    const ciris = getCiriTexts(animalBlock).sort();
    const expected = data.ciri.slice().sort();
    if (ciris.length !== expected.length || ciris.some((c,i) => c !== expected[i])) {
      correct = false;
      if (!firstIncorrectBlock) firstIncorrectBlock = animalBlock;
      blinkBlock(animalBlock);
    }
  }

  const topBlocks = workspace.getTopBlocks(false);
  const allowed = Object.keys(ANIMALS).map(a => 'hewan_' + a);
  if (topBlocks.some(b => !allowed.includes(b.type))) {
    correct = false;
    // Blink all top blocks that are not allowed
    topBlocks.forEach(b => {
      if (!allowed.includes(b.type)) {
        blinkBlock(b);
        if (!firstIncorrectBlock) firstIncorrectBlock = b;
      }
    });
  }

  if (firstIncorrectBlock) {
    const imgBlock = firstIncorrectBlock.getInputTargetBlock('GAMBAR');
    if (imgBlock) {
      const url = imgBlock.getFieldValue('SRC');
      drawImage(url);
    } else {
      previewCanvas.style.display = 'none';
    }
  } else if (imageCorrect) {
    // If all images correct, draw last image (or hide canvas if none)
    previewCanvas.style.display = 'none';
  }

  alert(imageCorrect ? '✅ Gambar benar' : '❌ Gambar salah');
  alert(correct ? '✅ Semua benar!' : '❌ Masih ada yang salah');
}

document.getElementById('check-btn').addEventListener('click', checkAnswer);

init();
