function initWhiteboard(opts={}) {
  const {
    canvasId='whiteboardCanvas',
    toggleBtnId='toggleWhiteboard',
    clearBtnId='clearWhiteboard',
    readOnly=false
  } = opts;
  const kelasId = window.kelasId;
  const lessonId = window.lessonId;
  if(!kelasId || !lessonId) return;
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const db = firebase.database();
  const dataRef = db.ref(`whiteboard_data/${kelasId}/${lessonId}`);

  let drawing = false;
  let last = null;
  let inputEl = null;

  function drawLine(p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  function drawText(action) {
    ctx.fillText(action.text, action.x, action.y);
  }

  function sendAction(action) {
    dataRef.push(action);
  }

  if(!readOnly) {
    canvas.addEventListener('mousedown', e => {
      drawing = true;
      last = {x:e.offsetX, y:e.offsetY};
    });
    canvas.addEventListener('mousemove', e => {
      if(!drawing) return;
      const cur = {x:e.offsetX, y:e.offsetY};
      drawLine(last, cur);
      sendAction({type:'line', from:last, to:cur});
      last = cur;
    });
    canvas.addEventListener('mouseup', ()=>{ drawing=false; });

    canvas.addEventListener('click', e => {
      if(inputEl) return;
      inputEl = document.createElement('input');
      inputEl.className = 'wb-input';
      inputEl.style.position = 'absolute';
      inputEl.style.left = (canvas.offsetLeft + e.offsetX) + 'px';
      inputEl.style.top = (canvas.offsetTop + e.offsetY) + 'px';
      document.body.appendChild(inputEl);
      inputEl.focus();
      const x = e.offsetX;
      const y = e.offsetY;
      function commit(){
        const text = inputEl.value.trim();
        document.body.removeChild(inputEl);
        if(text){
          drawText({text,x,y});
          sendAction({type:'text', text, x, y});
        }
        inputEl = null;
      }
      inputEl.addEventListener('blur', commit);
      inputEl.addEventListener('keydown', ev => { if(ev.key==='Enter'){ commit(); }});
    });

    const clearBtn = document.getElementById(clearBtnId);
    if(clearBtn){
      clearBtn.addEventListener('click', ()=>{
        dataRef.remove();
        ctx.clearRect(0,0,canvas.width, canvas.height);
      });
    }
  }

  dataRef.on('child_added', snap => {
    const val = snap.val();
    if(val.type==='line') drawLine(val.from, val.to);
    if(val.type==='text') drawText(val);
  });
  dataRef.on('child_removed', ()=>{ ctx.clearRect(0,0,canvas.width,canvas.height); });

  const toggleBtn = document.getElementById(toggleBtnId);
  if(toggleBtn){
    toggleBtn.addEventListener('click', ()=>{
      canvas.style.display = canvas.style.display==='none' ? 'block':'none';
    });
  }
}
