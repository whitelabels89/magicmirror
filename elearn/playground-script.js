let pyodideReadyPromise = loadPyodide();
let currentLab = '';
const badges = JSON.parse(localStorage.getItem('badges') || '[]');
const badgeIcons = {
  game: 'sports_esports',
  robot: 'smart_toy',
  python: 'code',
  puzzle: 'extension'
};

function addBadge(name) {
  if (!badges.includes(name)) {
    badges.push(name);
    localStorage.setItem('badges', JSON.stringify(badges));
    renderBadges();
  }
}

function renderBadges() {
  const container = document.getElementById('badges');
  container.innerHTML = badges
    .map(b => `<span class="material-icons badge">${badgeIcons[b] || 'emoji_events'}</span>`) 
    .join('');
}
renderBadges();

document.querySelectorAll('.lab-btn').forEach(btn => {
  btn.addEventListener('click', () => loadLab(btn.dataset.lab));
});

document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = '../index.html';
});

async function loadLab(name) {
  currentLab = name;
  const container = document.getElementById('lab-content');
  container.innerHTML = '';
  switch(name) {
    case 'game-maker':
      loadGameMaker(container); break;
    case 'robot-sim':
      loadRobotSim(container); break;
    case 'python-editor':
      loadPythonEditor(container); break;
    case 'puzzle-coding':
      loadPuzzle(container); break;
  }
}

function loadGameMaker(el) {
  const workspaceDiv = document.createElement('div');
  workspaceDiv.id = 'blockly-game';
  workspaceDiv.style.height = '300px';
  el.appendChild(workspaceDiv);
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.width = 400;
  canvas.height = 300;
  canvas.style.border = '1px solid #fff';
  el.appendChild(canvas);
  const btnRun = document.createElement('button'); btnRun.textContent='Mainkan';
  const btnReset = document.createElement('button'); btnReset.textContent='Reset';
  const btnSave = document.createElement('button'); btnSave.textContent='Simpan';
  el.append(btnRun, btnReset, btnSave);
  const workspace = Blockly.inject('blockly-game', {toolbox: `<xml><block type="controls_repeat_ext"></block><block type="controls_if"></block><block type="move"></block><block type="jump"></block><block type="collect"></block></xml>`});
  Blockly.defineBlocksWithJsonArray([
    {"type":"move","message0":"move","previousStatement":null,"nextStatement":null,"colour":120},
    {"type":"jump","message0":"jump","previousStatement":null,"nextStatement":null,"colour":120},
    {"type":"collect","message0":"collect","previousStatement":null,"nextStatement":null,"colour":120}
  ]);
  btnRun.onclick = () => {
    addBadge('game');
    alert('Game dijalankan!');
  };
  btnReset.onclick = () => workspace.clear();
  btnSave.onclick = () => localStorage.setItem('gameBlocks', Blockly.serialization.workspaces.save(workspace));
}

function loadRobotSim(el) {
  el.innerHTML = `<textarea id="robot-code" rows="5" cols="40">move_forward()\nturn_left()\nmove_forward()</textarea><br><button id="run-robot">Jalankan</button><button id="reset-robot">Ulangi</button><canvas id="robot-canvas" width="400" height="400" style="border:1px solid #fff"></canvas>`;
  let x=0,y=0,dir=0; // dir:0 east,1 south,2 west,3 north
  const ctx = document.getElementById('robot-canvas').getContext('2d');
  const robotImg = new Image();
  robotImg.src = 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Robot_cartoon_05.svg';
  robotImg.onload = draw;
  function draw(){
    ctx.clearRect(0,0,400,400);
    ctx.strokeStyle='#555';
    for(let i=0;i<=10;i++){
      ctx.beginPath();
      ctx.moveTo(i*40,0);ctx.lineTo(i*40,400);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,i*40);ctx.lineTo(400,i*40);ctx.stroke();
    }
    ctx.drawImage(robotImg,x*40,y*40,40,40);
  }
  document.getElementById('run-robot').onclick = async () => {
    const code=document.getElementById('robot-code').value;
    const py=`x=${x}\ny=${y}\ndir=${dir}\n`+
`def move_forward():\n  global x,y,dir\n  if dir==0:x+=1\n  elif dir==1:y+=1\n  elif dir==2:x-=1\n  else:y-=1\n`+
`def turn_left():\n  global dir\n  dir=(dir-1)%4\n`+
`def turn_right():\n  global dir\n  dir=(dir+1)%4\n`+code+`\nresult=(x,y,dir)`;
    let pyodide=await pyodideReadyPromise;
    await pyodide.runPythonAsync(py);
    x=pyodide.globals.get('x');
    y=pyodide.globals.get('y');
    dir=pyodide.globals.get('dir');
    draw();
    addBadge('robot');
  };
  document.getElementById('reset-robot').onclick=()=>{x=0;y=0;dir=0;draw();};
  draw();
}

function loadPythonEditor(el){
  el.innerHTML=`<textarea id="py-editor" rows="10" cols="60">print(\"Halo Dunia!\")</textarea><br><button id="run-py">Jalankan</button><pre id="py-output"></pre>`;
  document.getElementById('run-py').onclick=async()=>{
    let pyodide=await pyodideReadyPromise;
    let code=document.getElementById('py-editor').value;
    try{
      let result=await pyodide.runPythonAsync(code);
      document.getElementById('py-output').textContent=result||'';
      addBadge('python');
    }catch(e){
      document.getElementById('py-output').textContent=e;
    }
  };
}

function loadPuzzle(el){
  const workspaceDiv=document.createElement('div');
  workspaceDiv.id='blockly-puzzle';
  workspaceDiv.style.height='300px';
  el.appendChild(workspaceDiv);
  const toolbox=`<xml><block type="move_forward"></block><block type="turn_left"></block><block type="turn_right"></block><block type="controls_repeat_ext"></block></xml>`;
  Blockly.defineBlocksWithJsonArray([
    {"type":"move_forward","message0":"move forward","previousStatement":null,"nextStatement":null,"colour":60},
    {"type":"turn_left","message0":"turn left","previousStatement":null,"nextStatement":null,"colour":60},
    {"type":"turn_right","message0":"turn right","previousStatement":null,"nextStatement":null,"colour":60}
  ]);
  const workspace=Blockly.inject('blockly-puzzle',{toolbox});
  const btn=document.createElement('button');btn.textContent='Selesai';
  el.appendChild(btn);
  btn.onclick=()=>{addBadge('puzzle');alert('Selamat!');};
}
