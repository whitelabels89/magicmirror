const fs = require('fs');
const path = require('path');

module.exports = function(data){
  const tplPath = path.join(__dirname, 'templates', 'lesson_template.html');
  let tpl = fs.readFileSync(tplPath, 'utf8');
  tpl = tpl.replace('{{lesson_title}}', data.lesson_title || '');
  tpl = tpl.replace('{{lesson_id}}', data.lesson_id || '');

  let navItems='';
  let slides='';
  if(Array.isArray(data.slides)){
    data.slides.forEach((s,i)=>{
      const step=i+1;
      navItems+=`<li data-step="${step}">${step}. ${s.title||''}</li>`;
      slides+=`<div id="panel-${step}" class="step-content">`;
      if(s.title) slides+=`<h2>${s.title}</h2>`;
      if(s.text) slides+=`<p>${s.text}</p>`;
      if(s.code){
        const code = s.code.replace(/"/g,'&quot;');
        slides+=`<div class="typingBox-vscode" data-hint="${code}"></div>`;
        slides+='<button class="run-button">Jalankan</button><pre class="output-box">// Hasil akan muncul di sini</pre>';
      }
      slides+='</div>';
    });
  }
  tpl = tpl.replace('{{nav_items}}', navItems);
  tpl = tpl.replace('{{slides_loop}}', slides);
  tpl = tpl.replace('{{quiz_1}}', (data.quiz_part_1||[]).join('<br>'));
  tpl = tpl.replace('{{quiz_2}}', (data.quiz_part_2||[]).join('<br>'));
  return tpl;
};
