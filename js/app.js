/* =============================
   app.js - Dark Pro + XLSX full
   ============================= */

/*
  Requisitos:
  - index.html debe tener botones con data-target="inicio|edificios|fumigacion|historial"
  - Tener <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script> en el head
*/

const STORAGE_KEY = 'buildings';
let buildings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let current = null;

/* -------------------------
   Config colores (confirmados)
   ------------------------- */
const COLOR_MAP_UI = {
  'X':  { bg: '#007BFF', text: '#FFFFFF' }, // Azul fuerte
  '-':  { bg: '#ff6b6b', text: '#000000' }, // Rojo suave (lo usamos como "sin pasar")
  'NO': { bg: '#2ecc71', text: '#000000' }, // Verde
  'XG': { bg: '#00bcd4', text: '#000000' }  // Celeste
};

/* -------------------------
   Utiles guardado
   ------------------------- */
function saveAll(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
}

/* -------------------------
   Navegación SPA
   ------------------------- */
const menuBtns = document.querySelectorAll('.menu-btn');
const pages = document.querySelectorAll('.page');

menuBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    menuBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const target = btn.dataset.target;
    pages.forEach(p => p.classList.remove('visible'));
    const pageEl = document.getElementById(target);
    if(pageEl) pageEl.classList.add('visible');

    // cargas según la página
    if(target === 'edificios') refreshBuildingList();
    if(target === 'historial') renderFullHistory();
  });
});

/* -------------------------
   Crear nueva grilla desde Inicio
   ------------------------- */
document.getElementById('startGrid').addEventListener('click', () => {
  const name = document.getElementById('initName').value.trim();
  const rows = parseInt(document.getElementById('initRows').value);
  const cols = parseInt(document.getElementById('initCols').value);
  const mode = document.getElementById('initLabelMode').value || 'numbers';

  if(!name || !rows || !cols){
    return alert('Faltan datos para crear la grilla.');
  }

  buildings[name] = {
    rows,
    cols,
    mode,
    current: Array.from({length: rows}, () => Array(cols).fill('')),
    previous: Array.from({length: rows}, () => Array(cols).fill('')),
    history: []  // snapshots
  };

  current = name;
  saveAll();
  refreshBuildingList();
  loadGrid(name);

  // ir a fumigacion
  const btn = document.querySelector("button[data-target='fumigacion']");
  if(btn) btn.click();
});

/* -------------------------
   Lista de edificios guardados
   ------------------------- */
function refreshBuildingList(){
  const sel = document.getElementById('savedBuildings');
  if(!sel) return;
  sel.innerHTML = "<option value=''>-- Seleccionar --</option>";
  Object.keys(buildings).forEach(name => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = name;
    sel.appendChild(opt);
  });
}

/* cuando seleccionan edificio en el select */
const savedSel = document.getElementById('savedBuildings');
if(savedSel){
  savedSel.addEventListener('change', function(){
    if(this.value){
      current = this.value;
      loadGrid(current);
      const btn = document.querySelector("button[data-target='fumigacion']");
      if(btn) btn.click();
    }
  });
}

/* -------------------------
   Generar la tabla de la grilla (UI)
   ------------------------- */
function loadGrid(name){
  if(!buildings[name]) return;
  current = name;
  const data = buildings[name];
  const table = document.getElementById('gridTable');
  if(!table) return;
  table.innerHTML = '';

  // THEAD (column headers)
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th')); // corner
  for(let c = 0; c < data.cols; c++){
    const th = document.createElement('th');
    th.textContent = (data.mode === 'letters') ? colLabel(c) : (c + 1);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // TBODY (rows: from top = highest piso to bottom = 1)
  const tbody = document.createElement('tbody');
  for(let r = data.rows - 1; r >= 0; r--){
    const tr = document.createElement('tr');
    const thLeft = document.createElement('th');
    thLeft.className = 'leftHeader';
    thLeft.textContent = (r + 1);
    tr.appendChild(thLeft);

    for(let c = 0; c < data.cols; c++){
      const td = document.createElement('td');

      const sel = document.createElement('select');
      sel.className = 'cellSelect';

      ['', 'X', '-', 'NO', 'XG'].forEach(val => {
        const o = document.createElement('option');
        o.value = o.textContent = val;
        sel.appendChild(o);
      });

      sel.value = data.current[r][c] || '';

      // Apply color initially
      applySelectColor(sel);

      sel.addEventListener('change', () => {
        buildings[name].current[r][c] = sel.value;
        saveAll();
        applySelectColor(sel); // update color
        updateStats();
      });

      td.appendChild(sel);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  updateStats();
}

/* helper label columna (A,B,.., Z, AA..) */
function colLabel(i){
  let s = '';
  let n = i;
  while(true){
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
    if(n < 0) break;
  }
  return s;
}

/* Aplicar color en el select (UI) */
function applySelectColor(selectEl){
  const v = selectEl.value;
  if(COLOR_MAP_UI[v]){
    selectEl.style.backgroundColor = COLOR_MAP_UI[v].bg;
    selectEl.style.color = COLOR_MAP_UI[v].text;
    selectEl.style.fontWeight = '700';
  } else {
    // valor vacío -> fondo neutro oscuro/card
    selectEl.style.backgroundColor = '';
    selectEl.style.color = '';
    selectEl.style.fontWeight = '';
  }
  // keep attribute for possible CSS selectors (optional)
  selectEl.setAttribute('data-value', v);
}

/* -------------------------
   Estadísticas y comparación
   ------------------------- */
function updateStats(){
  if(!current) return;
  const data = buildings[current];
  const cur = data.current;
  const prev = data.previous;

  const count = arr => ({
    X: arr.flat().filter(x => x === 'X').length,
    dash: arr.flat().filter(x => x === '-').length,
    NO: arr.flat().filter(x => x === 'NO').length,
    XG: arr.flat().filter(x => x === 'XG').length
  });

  const C = count(cur);
  const P = count(prev);

  document.getElementById('curX').textContent = C.X;
  document.getElementById('curDash').textContent = C.dash;
  document.getElementById('curNO').textContent = C.NO;
  document.getElementById('curXG').textContent = C.XG;

  document.getElementById('prevX').textContent = P.X;
  document.getElementById('prevDash').textContent = P.dash;
  document.getElementById('prevNO').textContent = P.NO;
  document.getElementById('prevXG').textContent = P.XG;

  setDiff('diffX', C.X - P.X);
  setDiff('diffDash', C.dash - P.dash);
  setDiff('diffNO', C.NO - P.NO);
  setDiff('diffXG', C.XG - P.XG);
}

function setDiff(id, value){
  const el = document.getElementById(id);
  el.textContent = (value > 0) ? `+${value}` : `${value}`;
  el.className = 'diff ' + (value > 0 ? 'positive' : value < 0 ? 'negative' : 'equal');
}

/* -------------------------
   Finalizar: guardar snapshot y copiar actual -> previous
   ------------------------- */
document.getElementById('finalizeSnapshot').addEventListener('click', () => {
  if(!current) return alert('No hay edificio cargado.');
  const d = buildings[current];

  // save snapshot (history)
  d.history.push({
    fecha: new Date().toLocaleString(),
    snapshot: JSON.parse(JSON.stringify(d.current))
  });

  // current -> previous
  d.previous = JSON.parse(JSON.stringify(d.current));

  saveAll();
  updateStats();
  alert('Versión guardada correctamente.');
});

/* -------------------------
   Limpiar grilla (mantener rows/cols)
   ------------------------- */
document.getElementById('clearGridBtn').addEventListener('click', () => {
  if(!current) return alert('No hay edificio cargado.');
  if(!confirm('Limpiar la grilla actual?')) return;
  const d = buildings[current];
  d.current = Array.from({length: d.rows}, () => Array(d.cols).fill(''));
  saveAll();
  loadGrid(current);
});

/* -------------------------
   Eliminar edificio
   ------------------------- */
document.getElementById('deleteBuilding').addEventListener('click', () => {
  if(!current) return alert('Elegí un edificio primero.');
  if(!confirm(`Eliminar edificio "${current}"? Esto borra historial.`)) return;
  delete buildings[current];
  current = null;
  saveAll();
  refreshBuildingList();
  document.getElementById('gridTable').innerHTML = '';
});

/* -------------------------
   Export CSV (simple)
   ------------------------- */
document.getElementById('exportCSV').addEventListener('click', () => {
  if(!current) return alert('No hay edificio cargado.');
  const data = buildings[current].current;
  const csv = data.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${current}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* -------------------------
   Export XLSX (estilado)
   ------------------------- */
document.getElementById('exportXLSX')?.addEventListener('click', exportXLSX);
function exportXLSX(){
  if(!current) return alert('No hay edificio cargado.');
  if(typeof XLSX === 'undefined') return alert('XLSX library no encontrada. Agrega el script en <head>.');

  const data = buildings[current];
  const grid = data.current;

  // Construir array (AOA) para hoja:
  // fila 0: titulo
  // fila 1: fecha
  // fila 2: vacío
  // fila 3: encabezados (col labels, con columna 0 vacía)
  // fila 4..: filas de grilla (piso en col0, luego valores)

  const aoa = [];
  aoa.push([`Edificio: ${current}`]);
  aoa.push([`Fecha de exportación: ${new Date().toLocaleString()}`]);
  aoa.push([]);
  // header row
  const header = [''];
  for(let c=0;c<data.cols;c++){
    header.push( (data.mode === 'letters') ? colLabel(c) : (c+1) );
  }
  aoa.push(header);

  // grid rows (from top to bottom: highest piso first)
  for(let r = data.rows - 1; r >= 0; r--){
    const rowArr = [];
    rowArr.push(r + 1); // piso number in first col
    for(let c = 0; c < data.cols; c++){
      rowArr.push(grid[r][c] || '');
    }
    aoa.push(rowArr);
  }

  // crear worksheet desde aoa
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // establecer estilos por celda
  // mapa de colores en HEX sin #
  const colorMapXLSX = {
    'X':  { fg: '007BFF', font: 'FFFFFF' },
    '-':  { fg: 'FF6B6B', font: '000000' },
    'NO': { fg: '2ECC71', font: '000000' },
    'XG': { fg: '00BCD4', font: '000000' }
  };

  // Helper border
  const borderThin = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } }
  };

  // aplicar estilos:
  //  - titulo (fila 0): bold, merge across cols maybe (we won't merge to keep simple)
  //  - fecha (fila 1): italic
  //  - header row (fila 3): dark bg + white text + border
  //  - first column of grid: light bg bold (piso)
  //  - grid cells: border + fill color depending on value
  const totalCols = data.cols + 1; // including first column with floor numbers
  const totalRows = aoa.length;

  // iterate cells
  for(let R = 0; R < totalRows; R++){
    for(let C = 0; C < totalCols; C++){
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if(!cell) continue; // empty

      cell.s = cell.s || {};

      // Title row
      if(R === 0){
        cell.s.font = { bold: true, sz: 14, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '111827' } };
        cell.s.alignment = { horizontal: 'center' };
        cell.s.border = borderThin;
        continue;
      }

      // Date row
      if(R === 1){
        cell.s.font = { italic: true, sz: 11, color: { rgb: 'FFFFFF' } };
        cell.s.alignment = { horizontal: 'center' };
        cell.s.border = borderThin;
        continue;
      }

      // Header row (R === 3)
      if(R === 3){
        cell.s.font = { bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '111827' } };
        cell.s.alignment = { horizontal: 'center' };
        cell.s.border = borderThin;
        continue;
      }

      // For grid rows: first column (floor number)
      if(R >= 4 && C === 0){
        cell.s.font = { bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '0b1220' } }; // dark small box
        cell.s.alignment = { horizontal: 'center' };
        cell.s.border = borderThin;
        continue;
      }

      // grid values cells (R>=4, C>=1)
      if(R >= 4 && C >= 1){
        const val = (cell.v || '').toString();
        cell.s.alignment = { horizontal: 'center' };
        cell.s.border = borderThin;
        if(colorMapXLSX[val]){
          cell.s.fill = { fgColor: { rgb: colorMapXLSX[val].fg } };
          cell.s.font = { color: { rgb: colorMapXLSX[val].font }, bold: true };
        } else {
          // empty cell: subtle fill (card)
          cell.s.fill = { fgColor: { rgb: '1B212C' } };
          cell.s.font = { color: { rgb: 'DCE2F0' } };
        }
      }
    }
  }

  // Ajuste de columnas (anchos)
  ws['!cols'] = Array(totalCols).fill({ wch: 6 });

  // Rango
  ws['!ref'] = XLSX.utils.encode_range({ s: { r:0, c:0 }, e: { r: totalRows - 1, c: totalCols - 1 } });

  // book
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Grilla');

  // write file
  XLSX.writeFile(wb, `${current}.xlsx`);
}

/* -------------------------
   Historial completo (UI)
   ------------------------- */
function renderFullHistory(){
  const container = document.getElementById('historyList');
  if(!container) return;
  container.innerHTML = '';

  Object.keys(buildings).forEach(name => {
    const hist = buildings[name].history || [];
    if(hist.length === 0) return;

    // wrapper per building (group)
    const group = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = name;
    group.appendChild(title);

    hist.slice().reverse().forEach((entry, idx) => {
      const entryEl = document.createElement('div');
      entryEl.className = 'history-entry';

      const h4 = document.createElement('h4');
      h4.textContent = entry.fecha;
      entryEl.appendChild(h4);

      // small preview stats (counts) - optional quick view
      const snap = entry.snapshot || [];
      const counts = { X:0, dash:0, NO:0, XG:0 };
      snap.flat().forEach(v => {
        if(v === 'X') counts.X++;
        else if(v === '-') counts.dash++;
        else if(v === 'NO') counts.NO++;
        else if(v === 'XG') counts.XG++;
      });
      const divStats = document.createElement('div');
      divStats.className = 'note';
      divStats.textContent = `X: ${counts.X} — -: ${counts.dash} — NO: ${counts.NO} — XG: ${counts.XG}`;
      entryEl.appendChild(divStats);

      // restore button
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'restore-btn';
      restoreBtn.textContent = 'Restaurar esta versión';
      restoreBtn.addEventListener('click', () => {
        // restore into current and open fumigacion view
        buildings[name].current = JSON.parse(JSON.stringify(entry.snapshot));
        saveAll();
        current = name;
        loadGrid(name);
        const btn = document.querySelector("button[data-target='fumigacion']");
        if(btn) btn.click();
      });
      entryEl.appendChild(restoreBtn);

      group.appendChild(entryEl);
    });

    container.appendChild(group);
  });
}

/* -------------------------
   Init: render saved list if any
   ------------------------- */
(function init(){
  refreshBuildingList();
  // If there is a single building and no current, set current to first
  const keys = Object.keys(buildings);
  if(keys.length === 1 && !current){
    current = keys[0];
    // optionally auto-load
    // loadGrid(current);
  }
})();

/* End of file */
