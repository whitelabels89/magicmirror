
let pyodide = null;

// Load Pyodide and py_turtle once
const pyReady = (async () => {

  try {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
    await pyodide.loadPackage('micropip');
    await pyodide.runPythonAsync("import micropip\nawait micropip.install('py_turtle')");
  } catch (err) {
    document.getElementById('output').textContent = 'Gagal memuat Pyodide atau py_turtle: ' + err;
    throw err;
  }
})();


// Jalankan kode Python pengguna

async function runTurtle() {
  const output = document.getElementById('output');
  output.textContent = 'Menjalankan...';
  try {

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
  } catch (err) {
    output.textContent = err;
  }

}
