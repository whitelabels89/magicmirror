

let pyodide = null;

const pyReady = (async () => {
  try {
    pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/" });
  } catch (err) {
    document.getElementById("output").textContent = "Gagal memuat Pyodide: " + err;
    throw err;
  }
})();

function clearCanvas() {
  const canvas = document.getElementById("turtle-canvas");
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawLine(x1, y1, x2, y2, color = 'black', width = 1) {
  const canvas = document.getElementById("turtle-canvas");
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

async function runTurtle() {
  const status = document.getElementById("status");
  status.textContent = "Menjalankan...";
  const code = document.getElementById("code").value;

  await pyReady;

  const namespace = pyodide.globals.get("dict")();
  namespace.set("drawLine", pyodide.toPy(drawLine));

  const script = `
import math

class SimTurtle:
    def __init__(self):
        self.x = 150
        self.y = 150
        self.angle = 0
        self.color = 'black'
        self.width = 1

    def forward(self, distance):
        rad = math.radians(self.angle)
        new_x = self.x + math.cos(rad) * distance
        new_y = self.y + math.sin(rad) * distance
        drawLine(self.x, self.y, new_x, new_y, self.color, self.width)
        self.x = new_x
        self.y = new_y

    def right(self, angle):
        self.angle += angle
    def color(self, c):
        self.color = c
    def width(self, w):
        self.width = w

t = SimTurtle()
` + code;

  try {
    clearCanvas();
    await pyodide.runPythonAsync(script, { globals: namespace });
    status.textContent = "✅ Selesai!";
    namespace.destroy && namespace.destroy();
  } catch (err) {
    status.textContent = "❌ Error: " + err;
  }
}
