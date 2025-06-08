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
`;

  await pyodide.runPythonAsync(setup + '\n' + code);
}
