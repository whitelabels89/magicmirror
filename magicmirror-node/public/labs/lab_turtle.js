let pyodide = null;
const pyodideReadyPromise = (async () => {
  try {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
    await pyodide.loadPackage('micropip');
    await pyodide.runPythonAsync("import micropip\nawait micropip.install('py_turtle')");
  } catch (err) {
    document.getElementById('output').textContent = 'Gagal memuat Pyodide atau py_turtle: ' + err;
    throw err;
  }
})();

async function runTurtle() {
  const output = document.getElementById('output');
  output.textContent = 'Menjalankan...';
  try {
    await pyodideReadyPromise;
    const code = document.getElementById('code').value;
    await pyodide.runPythonAsync(`
import js, traceback
from py_turtle import Turtle, Canvas
canvas = Canvas(width=400, height=300)
js.document.getElementById('output').innerHTML = ''
js.document.getElementById('output').appendChild(canvas.element)
try:
` + code.split('\n').map(line => '  ' + line).join('\n') + `
except Exception as e:
  js.document.getElementById('output').textContent = traceback.format_exc()
`);
  } catch (err) {
    output.textContent = err;
  }
}
