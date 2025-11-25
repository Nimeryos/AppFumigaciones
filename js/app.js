/* app.js - lógica principal */
const gridTable = document.getElementById('gridTable');
const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const labelMode = document.getElementById('labelMode');
const nameInput = document.getElementById('buildingName');
const savedSelect = document.getElementById('savedBuildings');

const btnCreate = document.getElementById('createGrid');
const btnFinalize = document.getElementById('finalizeSnapshot');
const btnDelete = document.getElementById('deleteBuilding');
const btnExport = document.getElementById('exportCSV');

const STATES = ['', 'X', '-', 'NO', 'XG'];
const COLORS_CLASS = {
  'X': 'bg-X',
  '-': 'bg-dash',
  'NO': 'bg-NO',
  'XG': 'bg-XG',
  '': ''
};

/* estadisticas DOM */
const prevX = document.getElementById('prevX');
const prevDash = document.getElementById('prevDash');
const prevNO = document.getElementById('prevNO');
const prevXG = document.getElementById('prevXG');
const curX = document.getElementById('curX');
const curDash = document.getElementById('curDash');
const curNO = document.getElementById('curNO');
const curXG = document.getElementById('curXG');
const diffX = document.getElementById('diffX');
const diffDash = document.getElementById('diffDash');
const diffNO = document.getElementById('diffNO');
const diffXG = document.getElementById('diffXG');

let currentName = '';     // nombre del edificio actualmente cargado
let prevSnapshot = null;  // { rows, cols, values: [] }
let curSnapshot = null;   // { rows, cols, values: [] }

/* ---------- utilidades de storage ---------- */
function keyPrev(name){ return `edificio_${name}_prev`; }
function keyCur(name){ return `edificio_${name}_cur`; }

/* cargar lista de edificios */
function loadSavedList(){
  savedSelect.innerHTML = '<option value="">-- elegir --</option>';
  Object.keys(localStorage).forEach(k=>{
    if(k.startsWith('edificio_') && k.endsWith('_prev')){
      const name = k.replace('edificio_','').replace('_prev','');
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      savedSelect.appendChild(opt);
    }
  });
}

/* crear encabezados de columnas (A,B,C... o 1,2,3...) */
function makeColLabel(i){
  if(labelMode.value === 'letters'){
    // convertir i (0-based) a letra: 0->A, 25->Z, 26->AA ...
    let n = i;
    let s = '';
    while(true){
      s = String.fromCharCode((n % 26) + 65) + s;
      n = Math.floor(n/26) - 1;
      if(n < 0) break;
    }
    return s;
  } else {
    return (i+1).toString();
  }
}

/* genera la grilla en la tabla */
function generateGridFromSnapshot(rows, cols, values){
  gridTable.innerHTML = '';
  if(rows <= 0 || cols <= 0) return;

  // header
  const thead = document.createElement('thead');
  const topRow = document.createElement('tr');
  topRow.appendChild(document.createElement('th')); // esquina superior izquierda
  for(let c=0;c<cols;c++){
    const th = document.createElement('th');
    th.textContent = makeColLabel(c);
    topRow.appendChild(th);
  }
  thead.appendChild(topRow);
  gridTable.appendChild(thead);

  // body: IMPORTANT: pintamos filas desde el piso más alto hasta 1
  const tbody = document.createElement('tbody');
  for(let r = rows; r >= 1; r--){
    const tr = document.createElement('tr');
    // left header con número de piso
    const thLeft = document.createElement('th');
    thLeft.className = 'leftHeader';
    thLeft.textContent = r;
    tr.appendChild(thLeft);

    for(let c=0;c<cols;c++){
      const td = document.createElement('td');

      const select = document.createElement('select');
      select.className = 'cellSelect';
      STATES.forEach(s=>{
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        select.appendChild(o);
      });

      // index en values: rows * cols with order: from top to bottom? We store values row-major (from highest to lowest)
      // We'll define storage ordering: first element corresponds to highest floor (rows) / first column (0).
      const indexForStore = (rows - r) * cols + c;
      if(values && values[indexForStore] !== undefined){
        select.value = values[indexForStore];
        applyBgClass(select, td);
      }

      // cada vez que cambie, actualizamos snapshot actual y guardamos automáticamente
      select.addEventListener('change', ()=>{
        applyBgClass(select, td);
        // write into curSnapshot values
        if(curSnapshot && Array.isArray(curSnapshot.values)){
          curSnapshot.values[indexForStore] = select.value;
          saveCurSnapshot();
          refreshStats(); // update display
        }
      });

      td.appendChild(select);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  gridTable.appendChild(tbody);
  refreshStats();
}

/* aplica clase de fondo según valor del select */
function applyBgClass(select, td){
  td.classList.remove('bg-X','bg-dash','bg-NO','bg-XG');
  const v = select.value;
  if(COLORS_CLASS[v]) td.classList.add(COLORS_CLASS[v]);
}

/* ---------- snapshots ---------- */
function saveCurSnapshot(){
  if(!currentName || !curSnapshot) return;
  localStorage.setItem(keyCur(currentName), JSON.stringify(curSnapshot));
}

/* promote current snapshot to previous (finalizar día) */
function finalizeSnapshot(){
  if(!currentName || !curSnapshot) return;
  localStorage.setItem(keyPrev(currentName), JSON.stringify(curSnapshot));
  // set prevSnapshot to curSnapshot copy
  prevSnapshot = JSON.parse(JSON.stringify(curSnapshot));
  loadSavedList();
  refreshStats();
  alert('Versión actual guardada como "Vez anterior".');
}

/* delete building completely (both prev and cur) */
function deleteBuildingData(){
  if(!currentName) return;
  if(confirm(`Borrar todos los datos del edificio "${currentName}"?`)){
    localStorage.removeItem(keyPrev(currentName));
    localStorage.removeItem(keyCur(currentName));
    currentName = '';
    prevSnapshot = null;
    curSnapshot = null;
    gridTable.innerHTML = '';
    loadSavedList();
    alert('Edificio eliminado.');
  }
}

/* cargar edificio seleccionado */
function loadBuilding(name){
  if(!name) return;
  currentName = name;
  nameInput.value = name;

  const prev = JSON.parse(localStorage.getItem(keyPrev(name)) || 'null');
  const cur = JSON.parse(localStorage.getItem(keyCur(name)) || 'null');

  prevSnapshot = prev;
  if(cur){
    curSnapshot = cur;
  } else if(prev){
    // si no hay cur pero hay prev, clonamos prev como punto de partida
    curSnapshot = JSON.parse(JSON.stringify(prev));
  } else {
    curSnapshot = null;
  }

  // rellenar inputs si hay datos
  if(curSnapshot){
    rowsInput.value = curSnapshot.rows;
    colsInput.value = curSnapshot.cols;
    // maintain label mode if stored? optional - for now keep current selector
    generateGridFromSnapshot(curSnapshot.rows, curSnapshot.cols, curSnapshot.values);
  } else {
    gridTable.innerHTML = '';
  }

  refreshStats();
}

/* crear un nuevo edificio (no crea snapshot anterior) */
function createNewBuilding(){
  const name = nameInput.value.trim();
  const rows = parseInt(rowsInput.value);
  const cols = parseInt(colsInput.value);
  if(!name) return alert('Poné un nombre de edificio.');
  if(!rows || !cols) return alert('Ingresá cantidad de pisos y deptos por piso.');

  currentName = name;

  // crear curSnapshot vacío (valores vacíos)
  const values = new Array(rows * cols).fill('');
  curSnapshot = { rows, cols, values };
  // si no existe prev, prevSnapshot = null (se podrá finalizar)
  const prev = JSON.parse(localStorage.getItem(keyPrev(name)) || 'null');
  prevSnapshot = prev;

  // guardamos cur automáticamente
  saveCurSnapshot();
  loadSavedList();
  generateGridFromSnapshot(rows, cols, values);
}

/* refrescar estadísticas y comparación */
function refreshStats(){
  // contar actuales
  const countsCur = { 'X':0, '-':0, 'NO':0, 'XG':0 };
  const countsPrev = { 'X':0, '-':0, 'NO':0, 'XG':0 };

  if(curSnapshot && Array.isArray(curSnapshot.values)){
    curSnapshot.values.forEach(v=>{
      if(v in countsCur) countsCur[v]++;
    });
  } else {
    // try to read from DOM selects if snapshot missing
    document.querySelectorAll('#gridTable select').forEach(s=>{
      const v = s.value;
      if(v in countsCur) countsCur[v]++;
    });
  }

  if(prevSnapshot && Array.isArray(prevSnapshot.values)){
    prevSnapshot.values.forEach(v=>{
      if(v in countsPrev) countsPrev[v]++;
    });
  }

  // Update DOM
  prevX.textContent = countsPrev['X'] || 0;
  prevDash.textContent = countsPrev['-'] || 0;
  prevNO.textContent = countsPrev['NO'] || 0;
  prevXG.textContent = countsPrev['XG'] || 0;

  curX.textContent = countsCur['X'] || 0;
  curDash.textContent = countsCur['-'] || 0;
  curNO.textContent = countsCur['NO'] || 0;
  curXG.textContent = countsCur['XG'] || 0;

  // diffs
  const dx = countsCur['X'] - (countsPrev['X']||0);
  const dd = countsCur['-'] - (countsPrev['-']||0);
  const dn = countsCur['NO'] - (countsPrev['NO']||0);
  const dxg = countsCur['XG'] - (countsPrev['XG']||0);

  setDiff(diffX, dx);
  setDiff(diffDash, dd);
  setDiff(diffNO, dn);
  setDiff(diffXG, dxg);
}

function setDiff(elem, value){
  elem.textContent = (value>0? `+${value}` : `${value}`);
  elem.classList.remove('positive','negative','equal');
  if(value>0) elem.classList.add('positive');
  else if(value<0) elem.classList.add('negative');
  else elem.classList.add('equal');
}

/* export CSV (fila por fila, desde piso más alto a 1) */
function exportCSV(){
  if(!curSnapshot) return alert('No hay grilla para exportar.');
  const rows = curSnapshot.rows;
  const cols = curSnapshot.cols;
  const values = curSnapshot.values;

  let csv = '';
  for(let r = 0; r < rows; r++){
    const rowSlice = values.slice(r*cols, (r*cols)+cols);
    csv += rowSlice.join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentName || 'edificio'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- eventos UI ---------- */
btnCreate.addEventListener('click', ()=>{
  // si ya existe edificio y no se cargó, crear nuevo
  createNewBuilding();
});

btnFinalize.addEventListener('click', finalizeSnapshot);
btnDelete.addEventListener('click', ()=>{
  if(!currentName) return alert('Elegí o creá un edificio primero.');
  deleteBuildingData();
});

btnExport.addEventListener('click', exportCSV);

savedSelect.addEventListener('change', ()=>{
  const val = savedSelect.value;
  if(val) loadBuilding(val);
});

/* cuando cambia labelMode, regenerar si hay curSnapshot */
labelMode.addEventListener('change', ()=>{
  if(curSnapshot) generateGridFromSnapshot(curSnapshot.rows, curSnapshot.cols, curSnapshot.values);
});

/* al cargar la página */
(function init(){
  loadSavedList();
  // si el usuario escribió un nombre y quiere cargarlo manualmente:
  nameInput.addEventListener('change', ()=>{
    const name = nameInput.value.trim();
    if(name){
      // si existe prev, cargarlo; si solo cur existe, cargar cur
      const hasPrev = !!localStorage.getItem(keyPrev(name));
      const hasCur = !!localStorage.getItem(keyCur(name));
      if(hasCur || hasPrev){
        // cargar automáticamente
        loadBuilding(name);
      }
    }
  });
})();
