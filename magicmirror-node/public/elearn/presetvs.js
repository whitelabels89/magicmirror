if (typeof window.pyodide === 'undefined') {
  window.pyodideReady = false;
  window.loadPyodideAndPackages = async () => {
    window.pyodide = await loadPyodide();
    window.pyodideReady = true;
    console.log("✅ Pyodide loaded from presetvs");
  };
  loadPyodideAndPackages();
}
console.log("✅ presetvs.js loaded");
window.activeTypingBox = null;
function setupVscodeTypingBox(container) {
  console.log("🔧 setupVscodeTypingBox dipanggil untuk:", container);
  const rawHint = container.getAttribute('data-hint') || '';
  const hintCode = rawHint.replace(/&quot;/g, '"'); // Convert HTML-safe quotes
  const lines = hintCode.split('\n');
  container._typed = lines.map(() => '');
  container._lineIndex = 0;
  container._charIndex = 0;

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
        const typedChar = container._typed[idx][i];
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
    const totalTyped = container._typed.reduce((sum, line) => sum + line.length, 0);
    let correct = 0;
    container._typed.forEach((line, idx) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === lines[idx][i]) correct++;
      }
    });

    const percent = totalChars === 0 ? 0 : Math.floor((correct / totalChars) * 100);
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = percent + '%';
  }

  container.classList.add('initialized');
  container.setAttribute('tabindex', '0');
  container.addEventListener('click', () => {
    window.activeTypingBox = container;
    container.focus();
  });

  container.addEventListener('keydown', (e) => {
    if (window.activeTypingBox !== container) return;
    if (container._lineIndex < 0 || container._lineIndex >= lines.length) return;
    const line = lines[container._lineIndex];

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (container._typed[container._lineIndex].length < line.length) {
        container._typed[container._lineIndex] += e.key;
        container._charIndex++;
        if (container._charIndex >= line.length && container._lineIndex < lines.length - 1) {
          container._lineIndex++;
          container._charIndex = container._typed[container._lineIndex].length;
        }
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (container._charIndex > 0) {
        container._typed[container._lineIndex] = container._typed[container._lineIndex].slice(0, -1);
        container._charIndex--;
      } else if (container._lineIndex > 0) {
        container._lineIndex--;
        container._charIndex = container._typed[container._lineIndex].length;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const typedCode = container._typed.map(line => line).join('\n');
      outputEl.textContent = "⏳ Menjalankan...";
      (async () => {
        try {
          let output = "";
          window.pyodide.setStdout({ batched: (s) => { output += s + "\n"; } });
          let codeToRun = typedCode.includes('sys.stdout.flush()') ? typedCode : `${typedCode}\nsys.stdout.flush()`;
          await window.pyodide.runPythonAsync(`
import sys
import time
${codeToRun}
time.sleep(0.2)
`);
          outputEl.textContent = output.trim() || "✅ Berhasil (tidak ada output)";
        } catch (err) {
          outputEl.textContent = "❌ Error:\n" + err;
        } finally {
          window.pyodide.setStdout({});
        }
      })();
    }
    renderCode();
  });

  // Find or create Run button and output box near this container
  let runBtn = container.parentElement.querySelector('.run-button');
  let outputEl = container.parentElement.querySelector('.output-box');
  if (!runBtn) {
    runBtn = document.createElement('button');
    runBtn.className = 'run-button';
    runBtn.textContent = 'Jalankan';
    runBtn.style.marginTop = '1rem';
    runBtn.style.display = 'block';
    container.parentElement.appendChild(runBtn);
  }
  if (!outputEl) {
    outputEl = document.createElement('pre');
    outputEl.className = 'output-box';
    outputEl.style.background = '#222';
    outputEl.style.color = '#fff';
    outputEl.style.borderRadius = '6px';
    outputEl.style.padding = '0.5rem';
    outputEl.style.marginTop = '0.5rem';
    container.parentElement.appendChild(outputEl);
  }

  // Disable button until pyodide ready
  runBtn.disabled = true;
  const waitForPyodide = setInterval(() => {
    if (window.pyodideReady) {
      runBtn.disabled = false;
      clearInterval(waitForPyodide);
    }
  }, 100);

  // On click run Python
  runBtn.addEventListener('click', async () => {
    if (!window.pyodideReady) {
      outputEl.textContent = "⏳ Pyodide belum siap, tunggu sebentar...";
      return;
    }
    const typedCode = container._typed.map(line => line).join('\n');
    outputEl.textContent = "⏳ Menjalankan...";
    try {
      let output = "";
      window.pyodide.setStdout({ batched: (s) => { output += s + "\n"; } });
      let codeToRun = typedCode.includes('sys.stdout.flush()') ? typedCode : `${typedCode}\nsys.stdout.flush()`;
      await window.pyodide.runPythonAsync(`
import sys
import time
${codeToRun}
time.sleep(0.2)
`);
      outputEl.textContent = output.trim() || "✅ Berhasil (tidak ada output)";
    } catch (err) {
      outputEl.textContent = "❌ Error:\n" + err;
    } finally {
      window.pyodide.setStdout({});
    }
  });

  // Add hidden code-output element to store typed code for external use
  const hiddenOutput = document.createElement('div');
  hiddenOutput.className = 'code-output';
  hiddenOutput.style.display = 'none';
  container.appendChild(hiddenOutput);

  // Update isi code-output setiap kali user ketik
  const updateCodeOutput = () => {
    const lines = container._typed.map(line => line).join("\n");
    const outputEl = container.querySelector(".code-output");
    if (outputEl) outputEl.textContent = lines;
  };
  container.addEventListener("keydown", updateCodeOutput);

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
