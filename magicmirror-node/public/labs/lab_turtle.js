let pyodideReadyPromise = loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'});
async function runTurtle(){
  const pyodide = await pyodideReadyPromise;
  const code = document.getElementById('code').value;
  await pyodide.runPythonAsync(`\nimport js\nfrom pyodide.ffi import create_proxy\nimport micropip\nawait micropip.install('py_turtle')\nfrom py_turtle import Turtle, Canvas\ncanvas = Canvas(width=400, height=300)\njs.document.getElementById('output').innerHTML = ''\njs.document.getElementById('output').appendChild(canvas.element)\n` + code);
}
