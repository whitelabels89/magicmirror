(async () => {
  window.pyodide = await loadPyodide();
  window.pyodideReady = true;
  console.log("✅ Pyodide loaded from pyodide-tool.js");
})();

function attachTypingBoxListeners() {
  document.querySelectorAll('.typingBox-vscode').forEach(box => {
    if (box.dataset.listenerAttached) return;
    box.dataset.listenerAttached = "true";
    box.addEventListener('keydown', async function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!window.pyodideReady) {
          const outputBox = box.closest('.code-group')?.querySelector('.output-box') || document.getElementById('globalPyodideOutput');
          outputBox.textContent = '⏳ Pyodide belum siap, tunggu sebentar...';
          return;
        }
        const code = box.textContent.trim();
        const outputBox = box.closest('.code-group')?.querySelector('.output-box') || document.getElementById('globalPyodideOutput');
        try {
          let output = "";
          window.pyodide.setStdout({ batched: s => { output += s; } });
          window.pyodide.setStderr({ batched: s => { output += s; } });
          let codeToRun = code;
          if (!code.includes('\n') && code.includes(';')) codeToRun = codeToRun.replace(/;/g, '\n');
          if (!code.includes('import sys')) codeToRun = `import sys\n${codeToRun}`;
          if (!code.includes('sys.stdout.flush()')) codeToRun += `\nsys.stdout.flush()`;
          await window.pyodide.runPythonAsync(codeToRun);
          outputBox.textContent = output.trim() || '=== Tidak ada output ===';
        } catch (err) {
          outputBox.textContent = 'Error: ' + err;
        } finally {
          window.pyodide.setStdout({});
          window.pyodide.setStderr({});
        }
      }
    });
  });
}

async function runGlobalPyodideInput() {
  const code = document.getElementById('globalPyodideInput').textContent.trim();
  if (!code) {
    document.getElementById('globalPyodideOutput').textContent = '❌ Kode kosong. Ketik kode Python dulu.';
    return;
  }
  if (!window.pyodideReady) {
    document.getElementById('globalPyodideOutput').textContent = '⏳ Pyodide belum siap, tunggu sebentar...';
    return;
  }
  try {
    let output = "";
    window.pyodide.setStdout({ batched: s => { output += s; } });
    window.pyodide.setStderr({ batched: s => { output += s; } });
    let codeToRun = code;
    if (!code.includes('\n') && code.includes(';')) codeToRun = codeToRun.replace(/;/g, '\n');
    if (!code.includes('import sys')) codeToRun = `import sys\n${codeToRun}`;
    if (!code.includes('sys.stdout.flush()')) codeToRun += `\nsys.stdout.flush()`;
    await window.pyodide.runPythonAsync(codeToRun);
    document.getElementById('globalPyodideOutput').textContent = output.trim() || '=== Tidak ada output ===';
  } catch (err) {
    document.getElementById('globalPyodideOutput').textContent = 'Error: ' + err;
  } finally {
    window.pyodide.setStdout({});
    window.pyodide.setStderr({});
  }
}

function setupVscodeTypingBox(container) {
  container.classList.add('initialized');
  const hint = container.dataset.hint || "";
  container.textContent = hint;
  container.setAttribute('contenteditable', 'true');
  container.setAttribute('spellcheck', 'false');
  container.style.whiteSpace = 'pre';
  container.style.outline = 'none';
  container.style.fontFamily = "'Fira Code', monospace";
  container.style.fontSize = '16px';
  container.style.background = '#1e1e1e';
  container.style.color = '#d4d4d4';
  container.style.padding = '8px';
  container.style.borderRadius = '4px';
  container.style.minHeight = '32px';
  container.addEventListener('focus', () => {
    if (container.textContent === hint) container.textContent = "";
  });
  container.addEventListener('blur', () => {
    if (container.textContent.trim() === "") container.textContent = hint;
  });
}


// Attach custom Pyodide runner to buttons for quiz/lab, etc.
function attachCustomPyodideRunner(selector, outputSelector) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', async () => {
      const codeArea = btn.previousElementSibling;
      const outputBox = btn.nextElementSibling;
      const code = codeArea.value.trim();
      if (!window.pyodideReady) {
        outputBox.textContent = '⏳ Pyodide belum siap...';
        return;
      }
      try {
        let output = "";
        window.pyodide.setStdout({ batched: s => { output += s; } });
        window.pyodide.setStderr({ batched: s => { output += s; } });
        let codeToRun = code;
        if (!code.includes('\n') && code.includes(';')) codeToRun = codeToRun.replace(/;/g, '\n');
        if (!code.includes('import sys')) codeToRun = `import sys\n${codeToRun}`;
        if (!code.includes('sys.stdout.flush()')) codeToRun += `\nsys.stdout.flush()`;
        await window.pyodide.runPythonAsync(codeToRun);
        outputBox.textContent = output.trim() || '=== Tidak ada output ===';
      } catch (err) {
        outputBox.textContent = 'Error: ' + err;
      } finally {
        window.pyodide.setStdout({});
        window.pyodide.setStderr({});
      }
    });
  });
}