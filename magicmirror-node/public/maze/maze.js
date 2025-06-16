let levelIndex = 0;
let grid = [];
let player = {x:0,y:0,dir:1};
let finish = {x:0,y:0};
const CELL=40;
const canvas = document.getElementById('maze');
const ctx = canvas.getContext('2d');
const workspace = Blockly.inject('blocklyDiv',{toolbox: document.getElementById('toolbox')});
let actions = [];

function loadLevel(){
  grid = MAZE_LEVELS[levelIndex];
  for(let r=0;r<grid.length;r++){
    for(let c=0;c<grid[r].length;c++){
      if(grid[r][c]==2){player.x=c;player.y=r;player.dir=1;}
      if(grid[r][c]==3){finish.x=c;finish.y=r;}
    }
  }
  draw();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<10;r++){
    for(let c=0;c<10;c++){
      switch(grid[r][c]){
        case 1:
          ctx.fillStyle='#888';
          ctx.fillRect(c*CELL,r*CELL,CELL,CELL);
          break;
        case 3:
          ctx.fillStyle='red';
          ctx.fillRect(c*CELL+10,r*CELL+10,20,20);
          break;
      }
      ctx.strokeStyle='#ccc';
      ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);
    }
  }
  drawPlayer();
}

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x*CELL+CELL/2,player.y*CELL+CELL/2);
  ctx.rotate(player.dir*Math.PI/2);
  ctx.beginPath();
  ctx.moveTo(-10,10);
  ctx.lineTo(10,10);
  ctx.lineTo(0,-10);
  ctx.closePath();
  ctx.fillStyle='blue';
  ctx.fill();
  ctx.restore();
}

function moveForward(){actions.push('F');}
function turnLeft(){actions.push('L');}
function turnRight(){actions.push('R');}

function runCode(){
  actions=[];
  const code = Blockly.JavaScript.workspaceToCode(workspace);
  try{eval(code);}catch(e){alert('Kode salah');return;}
  execute();
}

function execute(){
  if(actions.length===0){checkResult();return;}
  const act=actions.shift();
  if(act==='L'){player.dir=(player.dir+3)%4;draw();setTimeout(execute,300);return;}
  if(act==='R'){player.dir=(player.dir+1)%4;draw();setTimeout(execute,300);return;}
  if(act==='F'){
    const nx=player.x+(player.dir===1?1:player.dir===3?-1:0);
    const ny=player.y+(player.dir===2?1:player.dir===0?-1:0);
    if(nx<0||ny<0||nx>=10||ny>=10||grid[ny][nx]===1){
      alert('Coba lagi');
      loadLevel();
      return;
    }
    player.x=nx;player.y=ny;draw();
    setTimeout(execute,300);
  }
}

function checkResult(){
  if(player.x===finish.x && player.y===finish.y){
    alert('Selamat!');
    levelIndex++;
    if(levelIndex<MAZE_LEVELS.length) loadLevel();
  }else{
    alert('Coba lagi');
  }
}

loadLevel();
document.getElementById('run-btn').addEventListener('click',runCode);
