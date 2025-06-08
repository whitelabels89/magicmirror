
// Load Pyodide and py_turtle once
const pyReady = (async () => {
// Jalankan kode Python pengguna
    await pyReady;
    const userCode = document.getElementById('code').value;
    const pyCode = [
      'import js, traceback',
      'from py_turtle import Turtle, Canvas',
      'canvas = Canvas(width=400, height=300)',
      "js.document.getElementById('output').innerHTML = ''",
      "js.document.getElementById('output').appendChild(canvas.element)",
      'try:',
      ...userCode.split('\n').map(l => '  ' + l),
      'except Exception as e:',
      "  js.document.getElementById('output').textContent = traceback.format_exc()"
    ].join('\n');
    await pyodide.runPythonAsync(pyCode);
  const output = document.getElementById('output');
  output.textContent = 'Menjalankan...';
  try {
    await pyodideReadyPromise;
    const code = document.getElementById('code').value;
    await pyodide.runPythonAsync(`
import js, traceback

let pyodideReadyPromise = loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'});
async function runTurtle(){
  const pyodide = await pyodideReadyPromise;
  const code = document.getElementById('code').value;

  const setup = `
import js
from pyodide.ffi import create_proxy
import micropip
await micropip.install('py_turtle')

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

`;

  await pyodide.runPythonAsync(setup + '\n' + code);

}
