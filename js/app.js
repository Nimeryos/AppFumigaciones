let buildings = JSON.parse(localStorage.getItem("buildings") || "{}");
let current = null;

function save() {
  localStorage.setItem("buildings", JSON.stringify(buildings));
}

function normalizeBuilding(b) {
  if (b.hasPB === undefined) b.hasPB = false;
  if (!b.history) b.history = [];

  const rows = b.hasPB ? b.rows + 1 : b.rows;

  if (!Array.isArray(b.current)) {
    b.current = Array.from({ length: rows }, () => Array(b.cols).fill(""));
  }
  if (!Array.isArray(b.previous)) {
    b.previous = Array.from({ length: rows }, () => Array(b.cols).fill(""));
  }
}

Object.values(buildings).forEach(normalizeBuilding);
save();

/* NAV */
document.querySelectorAll(".menu-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
    document.getElementById(btn.dataset.target).classList.add("visible");

    if (btn.dataset.target === "edificios") refreshBuildingList();
    if (btn.dataset.target === "historial") renderFullHistory();
  };
});

/* CREAR */
document.getElementById("startGrid").onclick = () => {
  const name = initName.value.trim();
  const rows = +initRows.value;
  const cols = +initCols.value;
  const mode = initLabelMode.value;
  const hasPB = initPB.checked;

  buildings[name] = {
    rows, cols, mode, hasPB,
    current: Array.from({ length: hasPB ? rows + 1 : rows }, () => Array(cols).fill("")),
    previous: [],
    history: []
  };

  current = name;
save();
loadGrid(name);

/* IR AUTOMÁTICAMENTE A GRILLA */
document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
document.querySelector('[data-target="fumigacion"]').classList.add("active");

document.querySelectorAll(".page").forEach(p => p.classList.remove("visible"));
document.getElementById("fumigacion").classList.add("visible");
};

/* LISTA */
function refreshBuildingList() {
  savedBuildings.innerHTML = "<option></option>";
  Object.keys(buildings).forEach(n => {
    const o = document.createElement("option");
    o.value = o.textContent = n;
    savedBuildings.appendChild(o);
  });
}

savedBuildings.onchange = e => {
  current = e.target.value;
  loadGrid(current);
};

/* GRILLA */
function loadGrid(name) {
  const d = buildings[name];
  normalizeBuilding(d);

  gridTable.innerHTML = "";
  buildingTitle.textContent = name;

  /* ---------- HEADER (A B C D / 1 2 3) ---------- */
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Celda vacía esquina superior izquierda
  headerRow.appendChild(document.createElement("th"));

  for (let c = 0; c < d.cols; c++) {
    const th = document.createElement("th");
    th.textContent =
      d.mode === "letters"
        ? String.fromCharCode(65 + c)
        : c + 1;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  gridTable.appendChild(thead);

  /* ---------- BODY ---------- */
  const tbody = document.createElement("tbody");

  for (let r = d.current.length - 1; r >= 0; r--) {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent =
      d.hasPB && r === 0
        ? "PB"
        : d.hasPB
        ? r
        : r + 1;

    tr.appendChild(th);

    for (let c = 0; c < d.cols; c++) {
      const td = document.createElement("td");
      const sel = document.createElement("select");

      ["", "X", "-", "NO", "XG"].forEach(v => {
        const o = document.createElement("option");
        o.value = o.textContent = v;
        sel.appendChild(o);
      });

      sel.value = d.current[r][c];
      applyCellColor(td, sel.value);

      sel.onchange = () => {
        d.current[r][c] = sel.value;
        applyCellColor(td, sel.value);
        save();
        updateStats();
      };

      td.appendChild(sel);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  gridTable.appendChild(tbody);
  updateStats();
}

function applyCellColor(td, v) {
  td.className = "";
  if (v === "X") td.classList.add("cell-X");
  if (v === "-") td.classList.add("cell-DASH");
  if (v === "NO") td.classList.add("cell-NO");
  if (v === "XG") td.classList.add("cell-XG");
}

/* STATS */
function updateStats() {
  if (!current) return;

  const d = buildings[current];
  const c = d.current.flat();
  const p = d.previous.flat();

  const count = (arr,v)=>arr.filter(x=>x===v).length;

  [["X","X"],["-","Dash"],["NO","NO"],["XG","XG"]].forEach(([v,k])=>{
    const cur = count(c,v);
    const prev = count(p,v);
    const diff = cur - prev;

    document.getElementById("cur"+k).textContent = cur;
    document.getElementById("prev"+k).textContent = prev;

    const diffEl = document.getElementById("diff"+k);
    diffEl.textContent = diff;

    diffEl.className = "";
    if(diff > 0) diffEl.classList.add("diff","positive");
    else if(diff < 0) diffEl.classList.add("diff","negative");
    else diffEl.classList.add("diff","equal");
  });
}

/* FINALIZAR */
finalizeSnapshot.onclick = () => {
  const d = buildings[current];
  d.previous = JSON.parse(JSON.stringify(d.current));
  d.history.push({ fecha: new Date().toLocaleString(), snapshot: d.previous });
  save();
  updateStats();
};
