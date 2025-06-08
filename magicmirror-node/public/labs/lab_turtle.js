
let pyodide = null;

// Load Pyodide once
const pyReady = (async () => {
  try {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
  } catch (err) {
    document.getElementById('output').textContent = 'Gagal memuat Pyodide: ' + err;

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
      'import js, traceback, types, sys',
      'canvas = js.document.createElement("canvas")',
      'canvas.width = 400',
      'canvas.height = 300',
      "js.document.getElementById('output').innerHTML = ''",
      "js.document.getElementById('output').appendChild(canvas)",
      '_jt = js.Turtle.new(canvas)',
      'class JSTurtle:',
      '  def forward(self, x): _jt.forward(x)',
      '  def backward(self, x): _jt.backward(x)',
      '  def right(self, a): _jt.right(a)',
      '  def left(self, a): _jt.left(a)',
      '  def penup(self): _jt.penup()',
      '  def pendown(self): _jt.pendown()',
      '  def speed(self, s): pass',
      'turtle = types.SimpleNamespace(Turtle=JSTurtle)',
      'sys.modules["turtle"] = turtle',
      'try:',
      ...userCode.split('\n').map(l => '  ' + l),
      'except Exception:',

      "  js.document.getElementById('output').textContent = traceback.format_exc()"
    ].join('\n');
    await pyodide.runPythonAsync(pyCode);
  } catch (err) {

    output.textContent = 'Gagal menjalankan kode: ' + err;
  }
}
