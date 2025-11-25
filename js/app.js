const grid = document.getElementById("grid");
const rowsInput = document.getElementById("rows");
const colsInput = document.getElementById("cols");
const nameInput = document.getElementById("buildingName");
const savedSelect = document.getElementById("savedBuildings");

const OPTIONS = ["", "X", "-", "NO", "XG"];

const COLORS = {
  "": "white",
  "X": "#4a90e2",
  "-": "#e26a6a",
  "NO": "#4caf50",
  "XG": "#76d7ea"
};

function generateGrid() {
  const rows = parseInt(rowsInput.value) || 0;
  const cols = parseInt(colsInput.value) || 0;

  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(40px, 1fr))`;
  grid.innerHTML = "";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const select = document.createElement("select");

      OPTIONS.forEach(op => {
        const o = document.createElement("option");
        o.value = op;
        o.textContent = op;
        select.appendChild(o);
      });

      select.addEventListener("change", () => {
        cell.style.background = COLORS[select.value];
        updateStats();
      });

      cell.appendChild(select);
      grid.appendChild(cell);
    }
  }

  updateStats();
}

function updateStats() {
  let countX = 0, countDash = 0, countNO = 0, countXG = 0;

  document.querySelectorAll("#grid select").forEach(s => {
    if (s.value === "X") countX++;
    else if (s.value === "-") countDash++;
    else if (s.value === "NO") countNO++;
    else if (s.value === "XG") countXG++;
  });

  document.getElementById("countX").textContent = `X: ${countX}`;
  document.getElementById("countDash").textContent = `-: ${countDash}`;
  document.getElementById("countNO").textContent = `NO: ${countNO}`;
  document.getElementById("countXG").textContent = `XG: ${countXG}`;
}

function saveBuilding() {
  if (!nameInput.value) return alert("Poné un nombre al edificio");

  const rows = rowsInput.value;
  const cols = colsInput.value;
  const values = [...document.querySelectorAll("#grid select")].map(s => s.value);

  const data = { rows, cols, values };
  localStorage.setItem("edificio_" + nameInput.value, JSON.stringify(data));
  loadSavedBuildings();
}

function loadSavedBuildings() {
  savedSelect.innerHTML = "";
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith("edificio_")) {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k.replace("edificio_", "");
      savedSelect.appendChild(opt);
    }
  });
}

function loadBuilding(key) {
  const data = JSON.parse(localStorage.getItem(key));
  if (!data) return;

  nameInput.value = key.replace("edificio_", "");
  rowsInput.value = data.rows;
  colsInput.value = data.cols;

  generateGrid();

  const selects = document.querySelectorAll("#grid select");
  selects.forEach((s, i) => {
    s.value = data.values[i];
    s.parentElement.style.background = COLORS[s.value];
  });

  updateStats();
}

function exportCSV() {
  const name = nameInput.value || "edificio";

  let csv = "";
  const cols = parseInt(colsInput.value);

  const values = [...document.querySelectorAll("#grid select")].map(s => s.value);
  for (let i = 0; i < values.length; i += cols) {
    csv += values.slice(i, i + cols).join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();

  URL.revokeObjectURL(url);
}

document.getElementById("newBuilding").onclick = generateGrid;
document.getElementById("saveBuilding").onclick = saveBuilding;
document.getElementById("clearGrid").onclick = () => generateGrid();
document.getElementById("exportCSV").onclick = exportCSV;

savedSelect.onchange = () => loadBuilding(savedSelect.value);

loadSavedBuildings();
