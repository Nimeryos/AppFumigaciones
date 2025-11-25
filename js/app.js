/* app.js - lógica principal (actualizado: limpia grilla opcional, finalize no borra) */
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
const btnClearGrid = document.getElementById('clearGridBtn');

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

let currentName = '';
let prevSnapshot = null;
let curSnapshot = null;

function keyPrev(name){ return `edificio_${name}_prev`; }
function keyCur(name){ return `edificio_${name}_cur`; }

function loadSavedList(){
  savedSelect.innerHTML = '<option value="">-- elegir --</option>';
  // list based on prev OR cur (we want any building that has data)
  const seen = new Set();
  Object.keys(localStorage).forEach(k=>{
    if(k.startsWith('edificio_')){
      let name = k.replace('edificio_','');
      name = name.replace('_prev','').replace('_cur','');
      if(!seen.has(name)){
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        savedSelect.appendChild(opt);
        seen.add(name);
      }
    }
  });
}

/* convertir index de columna en etiqueta (A,B... o 1,2...) */
function makeColLabel(i){
  if(labelMode.value === 'letters'){
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

/* genera la tabla con encabezados y selects; orden: piso más alto arriba (rows..1) */
function generateGridFromSnapshot(rows, cols, values){
  gridTable.innerHTML = '';
  if(rows <= 0 || cols <= 0) return;

  const thead = document.createElement('thead');
  const topRow = document.createElement('tr');
  topRow.appendChild(document.createElement('th'));
  for(let c=0; c<cols; c++){
    const th = document.createElement('th');
    th.textContent = makeColLabel(c);
    topRow.appendChild(th);
  }
  thead.appendChild(topRow);
  gridTable.appendChild(thead);

  const tbody = document.createElement('tbody');
  for(let r = rows; r >= 1; r--){
    const tr = document.createElement('tr');
    const thLeft = document.createElement('th');
    thLeft.className = 'leftHeader';
    thLeft.textContent = r;
    tr.appendChild(thLeft);

    for(let c=0; c<cols; c++){
      const td = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'cellSelect';

      STATES.forEach(s=>{
        const o = document.createElement('option');
        o.value = s;
        o.textContent = s;
        select.appendChild(o);
      });

      const indexForStore = (rows - r) * cols + c;
      if(values && values[indexForStore] !== undefined){
        select.value = values[indexForStore];
        applyBgClass(select, td);
      }

      select.addEventListener('change', ()=>{
        applyBgClass(select, td);
        if(curSnapshot && Array.isArray(curSnapshot.values)){
          curSnapshot.values[indexForStore] = select.value;
          saveCurSnapshot();
          refreshStats();
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

function applyBgClass(select, td){
  td.classList.remove('bg-X','bg-dash','bg-NO','bg-XG');
  const v = select.value;
  if(COLORS_CLASS[v]) td.classList.add(COLORS_CLASS[v]);
}

/* Guardar actual en localStorage */
function saveCurSnapshot(){
  if(!currentName || !curSnapshot) return;
  localStorage.setItem(keyCur(currentName), JSON.stringify(curSnapshot));
}

/* Finalizar: copia cur -> prev (no borra cur ni la grilla) */
function finalizeSnapshot(){
  if(!currentName || !curSnapshot) return;
  localStorage.setItem(keyPrev(currentName), JSON.stringify(curSnapshot));
  prevSnapshot = JSON.parse(JSON.stringify(curSnapshot));
  loadSavedList();
  refreshStats();
  alert('Versión actual guardada como "Vez anterior".');
}

/* Limpiar la grilla actual: vacía todos los valores (mantiene rows/cols) */
function clearCurrentGrid(){
  if(!curSnapshot) return;
  curSnapshot.values = new Array(curSnapshot.rows * curSnapshot.cols).fill('');
  saveCurSnapshot();
  generateGridFromSnapshot(curSnapshot.rows, curSnapshot.cols, curSnapshot.values);
}

/* Borrar edificio por completo (prev + cur) */
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

/* Cargar edificio (carga la versión ACTUAL si existe, si no usa prev) */
function loadBuilding(name){
  if(!name) return;
  currentName = name;
  nameInput.value = name;

  const cur = JSON.parse(localStorage.getItem(keyCur(name)) || 'null');
  const prev = JSON.parse(localStorage.getItem(keyPrev(name)) || 'null');

  // preferir cur (última fumigación), si no existe tomar prev
  if(cur){
    curSnapshot = cur;
    prevSnapshot = prev;
  } else if(prev){
    prevSnapshot = prev;
    // clonar prev como punto de partida para cur
    curSnapshot = JSON.parse(JSON.stringify(prev));
    saveCurSnapshot();
  } else {
    curSnapshot = null;
    prevSnapshot = null;
  }

  if(curSnapshot){
    rowsInput.value = curSnapshot.rows;
    colsInput.value = curSnapshot.cols;
    generateGridFromSnapshot(curSnapshot.rows, curSnapshot.cols, curSnapshot.values);
  } else {
    gridTable.innerHTML = '';
  }

  refreshStats();
}

/* Crear nuevo edificio/cur snapshot vacío (no toca prev) */
function createNewBuilding(){
  const name = nameInput.value.trim();
  const rows = parseInt(rowsInput.value);
  const cols = parseInt(colsInput.value);
  if(!name) return alert('Poné un nombre de edificio.');
  if(!rows || !cols) return alert('Ingresá cantidad de pisos y deptos por piso.');

  currentName = name;
  const values = new Array(rows * cols).fill('');
  curSnapshot = { rows, cols, values };
  prevSnapshot = JSON.parse(localStorage.getItem(keyPrev(name)) || 'null');

  saveCurSnapshot();
  loadSavedList();
  generateGridFromSnapshot(rows, cols, values);
}

/* refrescar estadísticas y comparación */
function refreshStats(){
  const countsCur = { 'X':0, '-':0, 'NO':0, 'XG':0 };
  const countsPrev = { 'X':0, '-':0, 'NO':0, 'XG':0 };

  if(curSnapshot && Array.isArray(curSnapshot.values)){
    curSnapshot.values.forEach(v=>{
      if(v in countsCur) countsCur[v]++;
    });
  } else {
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

  prevX.textContent = countsPrev['X'] || 0;
  prevDash.textContent = countsPrev['-'] || 0;
  prevNO.textContent = countsPrev['NO'] || 0;
  prevXG.textContent = countsPrev['XG'] || 0;

  curX.textContent = countsCur['X'] || 0;
  curDash.textContent = countsCur['-'] || 0;
  curNO.textContent = countsCur['NO'] || 0;
  curXG.textContent = countsCur['XG'] || 0;

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

/* export CSV */
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

/* eventos UI */
btnCreate.addEventListener('click', createNewBuilding);
btnFinalize.addEventListener('click', finalizeSnapshot);
btnDelete.addEventListener('click', ()=>{
  if(!currentName) return alert('Elegí o creá un edificio primero.');
  deleteBuildingData();
});
btnExport.addEventListener('click', exportCSV);
btnClearGrid.addEventListener('click', ()=>{
  if(!curSnapshot) return alert('No hay grilla para limpiar.');
  if(confirm('Limpiar la grilla actual (se quitarán todas las marcas)?')){
    clearCurrentGrid();
  }
});

savedSelect.addEventListener('change', ()=>{
  const val = savedSelect.value;
  if(val) loadBuilding(val);
});

labelMode.addEventListener('change', ()=>{
  if(curSnapshot) generateGridFromSnapshot(curSnapshot.rows, curSnapshot.cols, curSnapshot.values);
});

/* init */
(function init(){
  loadSavedList();
  nameInput.addEventListener('change', ()=>{
    const name = nameInput.value.trim();
    if(name){
      const hasCur = !!localStorage.getItem(keyCur(name));
      const hasPrev = !!localStorage.getItem(keyPrev(name));
      if(hasCur || hasPrev){
        loadBuilding(name);
      }
    }
  });
})();
