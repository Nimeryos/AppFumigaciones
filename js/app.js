/* =============================
   ========== app.js FULL =======
   ============================= */

let buildings = JSON.parse(localStorage.getItem("buildings") || "{}");
let current = null; // nombre del edificio que se está usando

function save() {
  localStorage.setItem("buildings", JSON.stringify(buildings));
}

/* =========================================
   =========== MODO OSCURO ==================
   ========================================= */
const darkSwitch = document.getElementById("darkModeSwitch");
darkSwitch.addEventListener("change", () => {
  document.body.classList.toggle("dark", darkSwitch.checked);
  localStorage.setItem("dark", darkSwitch.checked);
});

document.body.classList.toggle("dark", localStorage.getItem("dark") === "true");
darkSwitch.checked = localStorage.getItem("dark") === "true";

/* =========================================
   ============ NAVEGACIÓN ==================
   ========================================= */
const buttons = document.querySelectorAll(".menu-btn");
const pages = document.querySelectorAll(".page");

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    pages.forEach(p => p.classList.remove("visible"));
    document.getElementById(btn.dataset.target).classList.add("visible");

    if (btn.dataset.target === "edificios") refreshBuildingList();
    if (btn.dataset.target === "historial") renderFullHistory();
  });
});

/* =========================================
   ========== CREAR NUEVA GRILLA ============
   ========================================= */
document.getElementById("startGrid").onclick = () => {
  const name = document.getElementById("initName").value.trim();
  const rows = parseInt(document.getElementById("initRows").value);
  const cols = parseInt(document.getElementById("initCols").value);
  const mode = document.getElementById("initLabelMode").value;

  if (!name || !rows || !cols) return alert("Faltan datos para crear la grilla.");

  buildings[name] = {
    rows,
    cols,
    mode,
    current: Array.from({ length: rows }, () => Array(cols).fill("")),
    previous: Array.from({ length: rows }, () => Array(cols).fill("")),
    history: [] // historial de versiones completas
  };

  current = name;
  save();
  refreshBuildingList();
  loadGrid(name);

  // Ir automáticamente a Fumigación
  document.querySelector("button[data-target='fumigacion']").click();
};

/* =========================================
   ========== LISTA DE EDIFICIOS ============
   ========================================= */
function refreshBuildingList() {
  const select = document.getElementById("savedBuildings");
  select.innerHTML = "<option value=''>-- Seleccionar --</option>";

  Object.keys(buildings).forEach(name => {
    const op = document.createElement("option");
    op.value = op.textContent = name;
    select.appendChild(op);
  });
}

// Cargar al seleccionar

document.getElementById("savedBuildings").onchange = function () {
  if (this.value) {
    current = this.value;
    loadGrid(current);
    document.querySelector("button[data-target='fumigacion']").click();
  }
};

/* =========================================
   ========== GENERAR TABLA GRILLA ===========
   ========================================= */
function loadGrid(name) {
  const data = buildings[name];
  const table = document.getElementById("gridTable");
  table.innerHTML = "";

  // Crear encabezado
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  tr.appendChild(document.createElement("th"));

  for (let c = 0; c < data.cols; c++) {
    const th = document.createElement("th");
    th.textContent = data.mode === "letters" ? String.fromCharCode(65 + c) : c + 1;
    tr.appendChild(th);
  }

  thead.appendChild(tr);
  table.appendChild(thead);

  // Crear cuerpo
  const tbody = document.createElement("tbody");

  for (let r = data.rows - 1; r >= 0; r--) {
    const rowTR = document.createElement("tr");
    const rowLabel = document.createElement("th");
    rowLabel.textContent = r + 1;
    rowTR.appendChild(rowLabel);

    for (let c = 0; c < data.cols; c++) {
      const td = document.createElement("td");
      const select = document.createElement("select");

      ["", "X", "-", "NO", "XG"].forEach(v => {
        const op = document.createElement("option");
        op.value = op.textContent = v;
        select.appendChild(op);
      });

      select.value = data.current[r][c];

      select.onchange = () => {
        buildings[name].current[r][c] = select.value;
        save();
        updateStats();
      };

      td.appendChild(select);
      rowTR.appendChild(td);
    }

    tbody.appendChild(rowTR);
  }

  table.appendChild(tbody);
  updateStats();
}

/* =========================================
   ============== ESTADÍSTICAS ===============
   ========================================= */
function updateStats() {
  if (!current) return;

  const cur = buildings[current].current;
  const prev = buildings[current].previous;

  const count = arr => ({
    X: arr.flat().filter(x => x === "X").length,
    dash: arr.flat().filter(x => x === "-").length,
    NO: arr.flat().filter(x => x === "NO").length,
    XG: arr.flat().filter(x => x === "XG").length
  });

  const C = count(cur);
  const P = count(prev);

  // Actual
  document.getElementById("curX").textContent = C.X;
  document.getElementById("curDash").textContent = C.dash;
  document.getElementById("curNO").textContent = C.NO;
  document.getElementById("curXG").textContent = C.XG;

  // Prev
  document.getElementById("prevX").textContent = P.X;
  document.getElementById("prevDash").textContent = P.dash;
  document.getElementById("prevNO").textContent = P.NO;
  document.getElementById("prevXG").textContent = P.XG;

  // Dif
  function setDiff(id, val) {
    const el = document.getElementById(id);
    el.textContent = val > 0 ? "+" + val : val;
    el.className = "diff " + (val > 0 ? "positive" : val < 0 ? "negative" : "equal");
  }

  setDiff("diffX", C.X - P.X);
  setDiff("diffDash", C.dash - P.dash);
  setDiff("diffNO", C.NO - P.NO);
  setDiff("diffXG", C.XG - P.XG);
}

/* =========================================
   ======== FINALIZAR (GUARDAR VERSION) ======
   ========================================= */
document.getElementById("finalizeSnapshot").onclick = () => {
  if (!current) return;

  const data = buildings[current];

  // Guardar copia en historial
  data.history.push({
    fecha: new Date().toLocaleString(),
    snapshot: JSON.parse(JSON.stringify(data.current))
  });

  // Hacer actual -> previous
  data.previous = JSON.parse(JSON.stringify(data.current));

  save();
  updateStats();
  alert("Versión guardada correctamente.");
};

/* =========================================
   ============ LIMPIAR GRILLA ===============
   ========================================= */
document.getElementById("clearGridBtn").onclick = () => {
  if (!current) return;

  const data = buildings[current];
  data.current = Array.from({ length: data.rows }, () => Array(data.cols).fill(""));
  save();
  loadGrid(current);
};

/* =========================================
   ============== ELIMINAR ===================
   ========================================= */
document.getElementById("deleteBuilding").onclick = () => {
  if (!current) return;
  if (!confirm("¿Eliminar este edificio?")) return;

  delete buildings[current];
  current = null;
  save();
  refreshBuildingList();
  document.getElementById("gridTable").innerHTML = "";
};

/* =========================================
   ============ EXPORTAR CSV =================
   ========================================= */
document.getElementById("exportCSV").onclick = () => {
  if (!current) return;
  const data = buildings[current].current;

  let csv = data.map(row => row.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = current + ".csv";
  a.click();
};

/* =========================================
   ========= HISTORIAL COMPLETO =============
   ========================================= */
function renderFullHistory() {
  const box = document.getElementById("historyList");
  box.innerHTML = "";

  Object.keys(buildings).forEach(name => {
    const hist = buildings[name].history;
    if (hist.length === 0) return;

    hist
      .slice()
      .reverse()
      .forEach((entry, i) => {
        const div = document.createElement("div");
        div.className = "history-entry";

        div.innerHTML = `
          <h4>${name} — ${entry.fecha}</h4>
          <button class='restore-btn' data-name='${name}' data-index='${hist.length - 1 - i}'>Restaurar esta versión</button>
        `;

        box.appendChild(div);
      });
  });

  // Botón restaurar versión
  document.querySelectorAll(".restore-btn").forEach(btn => {
    btn.onclick = () => {
      const name = btn.dataset.name;
      const index = parseInt(btn.dataset.index);

      buildings[name].current = JSON.parse(JSON.stringify(buildings[name].history[index].snapshot));
      save();

      current = name;
      loadGrid(name);

      document.querySelector("button[data-target='fumigacion']").click();
    };
  });
}
