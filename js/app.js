let buildings = JSON.parse(localStorage.getItem("buildings") || "{}");
let current = null;

function save() {
  localStorage.setItem("buildings", JSON.stringify(buildings));
}

/* =============================
   ======= COMPATIBILIDAD ======
   ============================= */
// Asegura que edificios viejos no rompan la app
function normalizeBuilding(b) {
  if (b.hasPB === undefined) b.hasPB = false;
  if (!b.history) b.history = [];

  const expectedRows = b.hasPB ? b.rows + 1 : b.rows;

  if (!Array.isArray(b.current) || b.current.length !== expectedRows) {
    b.current = Array.from({ length: expectedRows }, () => Array(b.cols).fill(""));
  }

  if (!Array.isArray(b.previous) || b.previous.length !== expectedRows) {
    b.previous = Array.from({ length: expectedRows }, () => Array(b.cols).fill(""));
  }
}

Object.values(buildings).forEach(normalizeBuilding);
save();

/* =============================
   ========== NAVEGACIÓN =======
   ============================= */
const buttons = document.querySelectorAll(".menu-btn");
const pages = document.querySelectorAll(".page");

buttons.forEach(btn => {
  btn.onclick = () => {
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    pages.forEach(p => p.classList.remove("visible"));
    document.getElementById(btn.dataset.target).classList.add("visible");

    if (btn.dataset.target === "edificios") refreshBuildingList();
    if (btn.dataset.target === "historial") renderFullHistory();
  };
});

/* =============================
   ===== CREAR NUEVA GRILLA ====
   ============================= */
document.getElementById("startGrid").onclick = () => {
  const name = document.getElementById("initName").value.trim();
  const rows = parseInt(document.getElementById("initRows").value);
  const cols = parseInt(document.getElementById("initCols").value);
  const mode = document.getElementById("initLabelMode").value;
  const hasPB = document.getElementById("initPB").checked;

  if (!name || !rows || !cols) return alert("Faltan datos");

  const totalRows = hasPB ? rows + 1 : rows;

  buildings[name] = {
    rows,
    cols,
    mode,
    hasPB,
    current: Array.from({ length: totalRows }, () => Array(cols).fill("")),
    previous: Array.from({ length: totalRows }, () => Array(cols).fill("")),
    history: []
  };

  current = name;
  save();
  loadGrid(name);
  document.querySelector("button[data-target='fumigacion']").click();
};

/* =============================
   ===== LISTA EDIFICIOS =======
   ============================= */
function refreshBuildingList() {
  const select = document.getElementById("savedBuildings");
  select.innerHTML = "<option value=''>Seleccionar</option>";

  Object.keys(buildings).forEach(name => {
    const op = document.createElement("option");
    op.value = op.textContent = name;
    select.appendChild(op);
  });
}

document.getElementById("savedBuildings").onchange = function () {
  if (!this.value) return;
  current = this.value;
  loadGrid(current);
  document.querySelector("button[data-target='fumigacion']").click();
};

/* =============================
   ===== RENDER GRILLA ========
   ============================= */
function loadGrid(name) {
  const data = buildings[name];
  normalizeBuilding(data);

  const table = document.getElementById("gridTable");
  table.innerHTML = "";

  document.getElementById("buildingTitle").textContent = name;

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  hr.appendChild(document.createElement("th"));

  for (let c = 0; c < data.cols; c++) {
    const th = document.createElement("th");
    th.textContent = data.mode === "letters" ? String.fromCharCode(65 + c) : c + 1;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let r = data.current.length - 1; r >= 0; r--) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");

    if (data.hasPB && r === 0) th.textContent = "PB";
    else th.textContent = data.hasPB ? r : r + 1;

    tr.appendChild(th);

    for (let c = 0; c < data.cols; c++) {
      const td = document.createElement("td");
      const select = document.createElement("select");

      ["", "X", "-", "NO", "XG"].forEach(v => {
        const op = document.createElement("option");
        op.value = op.textContent = v;
        select.appendChild(op);
      });

      select.value = data.current[r][c] || "";
       applyCellColor(td, select.value);
      select.onchange = () => {
      data.current[r][c] = select.value;
        applyCellColor(td, select.value);
        save();
        updateStats();
      };


      td.appendChild(select);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  updateStats();
}

function applyCellColor(td, value) {
  td.classList.remove("cell-X", "cell-NO", "cell--", "cell-XG");
  if (value) {
    td.classList.add("cell-" + value);
  }
}

/* =============================
   ===== ESTADÍSTICAS =========
   ============================= */
function updateStats() {
  if (!current) return;
  const cur = buildings[current].current.flat();
  const prev = buildings[current].previous.flat();

  const count = (arr, v) => arr.filter(x => x === v).length;

  const map = { X: "X", "-": "Dash", NO: "NO", XG: "XG" };

  Object.keys(map).forEach(v => {
    const curVal = count(cur, v);
    const prevVal = count(prev, v);

    document.getElementById("cur" + map[v]).textContent = curVal;
    document.getElementById("prev" + map[v]).textContent = prevVal;

    const diff = curVal - prevVal;
    const d = document.getElementById("diff" + map[v]);
    d.textContent = diff > 0 ? "+" + diff : diff;
    d.className = "diff " + (diff > 0 ? "positive" : diff < 0 ? "negative" : "equal");
  });
}

/* =============================
   ===== FINALIZAR ============
   ============================= */
document.getElementById("finalizeSnapshot").onclick = () => {
  if (!current) return;
  const d = buildings[current];
  d.history.push({ fecha: new Date().toLocaleString(), snapshot: JSON.parse(JSON.stringify(d.current)) });
  d.previous = JSON.parse(JSON.stringify(d.current));
  save();
  updateStats();
};

/* =============================
   ===== LIMPIAR ==============
   ============================= */
document.getElementById("clearGridBtn").onclick = () => {
  if (!current) return;
  const d = buildings[current];
  d.current = Array.from({ length: d.current.length }, () => Array(d.cols).fill(""));
  save();
  loadGrid(current);
};

/* =============================
   ===== ELIMINAR =============
   ============================= */
document.getElementById("deleteBuilding").onclick = () => {
  if (!current || !confirm("Eliminar edificio?")) return;
  delete buildings[current];
  current = null;
  save();
  document.getElementById("gridTable").innerHTML = "";
};

/* =============================
   ===== EXPORT CSV ===========
   ============================= */
document.getElementById("exportCSV").onclick = () => {
  if (!current) return;
  const d = buildings[current];
  let csv = d.current.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = current + ".csv";
  a.click();
};

/* =============================
   ===== HISTORIAL ============
   ============================= */
function renderFullHistory() {
  const box = document.getElementById("historyList");
  box.innerHTML = "";

  Object.entries(buildings).forEach(([name, b]) => {
    normalizeBuilding(b);
    b.history.slice().reverse().forEach(h => {
      const div = document.createElement("div");
      div.innerHTML = `<b>${name}</b> — ${h.fecha} <button>Restaurar</button>`;
      div.querySelector("button").onclick = () => {
        b.current = JSON.parse(JSON.stringify(h.snapshot));
        save();
        current = name;
        loadGrid(name);
        document.querySelector("button[data-target='fumigacion']").click();
      };
      box.appendChild(div);
    });
  });
}
