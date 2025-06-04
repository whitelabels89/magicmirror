function setupVscodeTypingBox(container) {
  const hintCode = container.getAttribute('data-hint') || '';
  const lines = hintCode.split('\n');
  const typed = lines.map(() => '');
  let lineIndex = 0;
  let charIndex = 0;

  function classifyToken(char, line, i) {
    if (line.includes('=') && i < line.indexOf('=')) return 'keyword';
    if ((line.slice(i).startsWith('input') && i + 4 < line.length) || (line.slice(i).startsWith('int') && i + 2 < line.length)) return 'func';
    let inStr = false;
    for (let j = 0; j <= i; j++) {
      if (line[j] === "'") inStr = !inStr;
      if (line[j] === '"') inStr = !inStr;
    }
    if (inStr) return 'str';
    return '';
  }

  function renderCode() {
    container.innerHTML = '';
    lines.forEach((line, idx) => {
      const div = document.createElement('div');
      div.className = 'code-line';

      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = idx + 1;
      div.appendChild(lineNumber);

      const codeText = document.createElement('span');
      codeText.className = 'code-text';

      for (let i = 0; i < line.length; i++) {
        const span = document.createElement('span');
        const trueChar = line[i];
        const typedChar = typed[idx][i];
        const tokenClass = classifyToken(trueChar, line, i);
        if (tokenClass) span.classList.add(tokenClass);

        if (typedChar !== undefined) {
          span.textContent = typedChar;
          if (typedChar === trueChar) {
            span.classList.add('correct');
          } else {
            span.classList.add('wrong');
          }
        } else {
          span.textContent = trueChar;
          span.style.opacity = 0.3;
        }
        codeText.appendChild(span);
      }

      div.appendChild(codeText);
      container.appendChild(div);
    });

    const totalChars = lines.reduce((sum, line) => sum + line.length, 0);
    const totalTyped = typed.reduce((sum, line) => sum + line.length, 0);
    let correct = 0;
    typed.forEach((line, idx) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === lines[idx][i]) correct++;
      }
    });

    const percent = totalChars === 0 ? 0 : Math.floor((correct / totalChars) * 100);
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = percent + '%';
  }

  container.classList.add('initialized');

  document.addEventListener('keydown', (e) => {
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const line = lines[lineIndex];

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (typed[lineIndex].length < line.length) {
        typed[lineIndex] += e.key;
        charIndex++;
        if (charIndex >= line.length && lineIndex < lines.length - 1) {
          lineIndex++;
          charIndex = typed[lineIndex].length;
        }
      }
    } else if (e.key === 'Backspace') {
      if (charIndex > 0) {
        typed[lineIndex] = typed[lineIndex].slice(0, -1);
        charIndex--;
      } else if (lineIndex > 0) {
        lineIndex--;
        charIndex = typed[lineIndex].length;
      }
    }
    renderCode();
  });

  renderCode();
}

// Fallback init trigger (jika belum auto-inisialisasi)
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(() => {
    document.querySelectorAll('.typingBox-vscode').forEach(el => {
      if (!el.classList.contains('initialized')) {
        setupVscodeTypingBox(el);
        el.classList.add('initialized');
      }
    });
  }, 100);
});
