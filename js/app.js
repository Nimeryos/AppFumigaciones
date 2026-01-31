/****************************
 * ESTADO GLOBAL
 ****************************/
let currentBuilding = null;
let buildings = JSON.parse(localStorage.getItem("buildings")) || {};
let history = JSON.parse(localStorage.getItem("history")) || [];

/****************************
 * UTILIDADES
 ****************************/
function saveBuildings() {
  localStorage.setItem("buildings", JSON.stringify(buildings));
}

function saveHistory() {
  localStorage.setItem("history", JSON.stringify(history));
}

function $(id) {
  return document.getElementById(id);
}

/****************************
 * MENÚ / NAVEGACIÓN
 ****************************/
document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
    $(btn.dataset.target).classList.add("visible");
  });
});

/****************************
 * INICIO – CREAR GRILLA
 ****************************/
$("startGrid").addEventListener("click", () => {
  const name = $("initName").value.trim();
  const rows = parseInt($("initRows").value);
  const cols = parseInt($("initCols").value);
  const labelMode = $("initLabelMode").value;
  const hasPB = $("initPB").checked;

  if (!name || rows < 1 || cols < 1) {
    alert("Completá todos los datos");
    return;
  }

  const totalRows = hasPB ? rows + 1 : rows;

  const grid = [];
  for (let r = 0; r < totalRows; r++) {
    grid.push(Array(cols).fill(""));
  }

  buildings[name] = {
    name,
    rows,
    cols,
    hasPB,
    labelMode,
    grid,
    lastUpdate: new Date().toISOString()
  };

  currentBuilding = name;
  saveBuildings();
  updateBuildingsSelect();
  loadGrid(name);

  showPage("fumigacion");
});

/****************************
 * MOSTRAR SECCIÓN
 ****************************/
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
  $(id).classList.add("visible");

  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.menu-btn[data-target="${id}"]`)?.classList.add("active");
}

/****************************
 * CARGAR GRILLA
 ****************************/
function loadGrid(name) {
  const data = buildings[name];
  if (!data) return;

  currentBuilding = name;
  $("buildingTitle").textContent = data.name;

  const table = $("gridTable");
  table.innerHTML = "";

  // Header
  const header = document.createElement("tr");
  header.appendChild(document.createElement("th"));

  for (let c = 0; c < data.cols; c++) {
    const th = document.createElement("th");
    th.textContent =
      data.labelMode === "letters"
        ? String.fromCharCode(65 + c)
        : c + 1;
    header.appendChild(th);
  }
  table.appendChild(header);

  const totalRows = data.hasPB ? data.rows + 1 : data.rows;

  for (let r = totalRows - 1; r >= 0; r--) {
    const tr = document.createElement("tr");

    const rowLabel = document.createElement("th");
    if (data.hasPB && r === 0) {
      rowLabel.textContent = "PB";
    } else {
      rowLabel.textContent = data.hasPB ? r : r + 1;
    }
    tr.appendChild(rowLabel);

    for (let c = 0; c < data.cols; c++) {
      const td = document.createElement("td");
      td.textContent = data.grid[r][c] || "";

      td.addEventListener("click", () => {
        td.textContent = nextValue(td.textContent);
        data.grid[r][c] = td.textContent;
        data.lastUpdate = new Date().toISOString();
        saveBuildings();
      });

      tr.appendChild(td);
    }

    table.appendChild(tr);
  }
}

/****************************
 * CICLO DE ESTADOS
 ****************************/
const STATES = ["", "X", "-", "NO", "XG"];

function nextValue(current) {
  const i = STATES.indexOf(current);
  return STATES[(i + 1) % STATES.length];
}

/****************************
 * EDIFICIOS GUARDADOS
 ****************************/
function updateBuildingsSelect() {
  const sel = $("savedBuildings");
  sel.innerHTML = "";

  Object.keys(buildings).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

$("savedBuildings").addEventListener("change", e => {
  loadGrid(e.target.value);
  showPage("fumigacion");
});

/****************************
 * LIMPIAR GRILLA
 ****************************/
$("clearGridBtn").addEventListener("click", () => {
  if (!currentBuilding) return;

  const b = buildings[currentBuilding];
  const totalRows = b.hasPB ? b.rows + 1 : b.rows;

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < b.cols; c++) {
      b.grid[r][c] = "";
    }
  }

  saveBuildings();
  loadGrid(currentBuilding);
});

/****************************
 * ELIMINAR EDIFICIO
 ****************************/
$("deleteBuilding").addEventListener("click", () => {
  if (!currentBuilding) return;
  if (!confirm("Eliminar edificio?")) return;

  delete buildings[currentBuilding];
  currentBuilding = null;
  saveBuildings();
  updateBuildingsSelect();
  showPage("inicio");
});

/****************************
 * HISTORIAL
 ****************************/
function updateHistory() {
  const container = $("historyList");
  container.innerHTML = "";

  history.forEach(h => {
    const div = document.createElement("div");
    div.textContent = `${h.date} - ${h.name}`;
    container.appendChild(div);
  });
}

/****************************
 * EXPORTAR CSV
 ****************************/
$("exportCSV").addEventListener("click", () => {
  if (!currentBuilding) return;

  const b = buildings[currentBuilding];
  let csv = "";

  const header = ["Piso"];
  for (let c = 0; c < b.cols; c++) {
    header.push(b.labelMode === "letters"
      ? String.fromCharCode(65 + c)
      : c + 1);
  }
  csv += header.join(",") + "\n";

  const totalRows = b.hasPB ? b.rows + 1 : b.rows;

  for (let r = totalRows - 1; r >= 0; r--) {
    const row = [];

    if (b.hasPB && r === 0) row.push("PB");
    else row.push(b.hasPB ? r : r + 1);

    for (let c = 0; c < b.cols; c++) {
      row.push(b.grid[r][c] || "");
    }

    csv += row.join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${currentBuilding}.csv`;
  link.click();
});

/****************************
 * INIT
 ****************************/
updateBuildingsSelect();
updateHistory();
