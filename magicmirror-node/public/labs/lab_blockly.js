
// Inisialisasi Blockly
const workspaceBlockly = Blockly.inject('blocklyDiv', {
  toolbox: document.getElementById('toolbox')
});

let pyodide = null;
const pyReady = (async () => {
  try {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
  } catch (err) {
    document.getElementById('output').textContent = 'Gagal memuat Pyodide: ' + err;
    throw err;
  }
})();
function showCode(){

  const code = Blockly.Python.workspaceToCode(workspaceBlockly);

  document.getElementById('code').textContent = code;
}
async function runBlocks(){
  const output = document.getElementById('output');
  output.textContent = 'Menjalankan...';

  const code = Blockly.Python.workspaceToCode(workspaceBlockly);

  document.getElementById('code').textContent = code;
  try {
    await pyReady;
    await pyodide.runPythonAsync(`import sys, js, traceback\nfrom io import StringIO\nbuf = StringIO()\nsys.stdout = buf\nsys.stderr = buf\ntry:\n` + code.split('\n').map(l=>'  '+l).join('\n') + `\nexcept Exception as e:\n  traceback.print_exc()\nfinally:\n  js.document.getElementById("output").textContent = buf.getvalue()`);
  } catch(err){
    output.textContent = err;
  }
}
