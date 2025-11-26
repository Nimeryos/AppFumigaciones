/* Dark Professional Version - app.js */

let buildings = JSON.parse(localStorage.getItem("buildings") || "{}");
let current = null;
function save(){ localStorage.setItem("buildings", JSON.stringify(buildings)); }

/* NAVIGATION */
const buttons=document.querySelectorAll(".menu-btn");
const pages=document.querySelectorAll(".page");
buttons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    buttons.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    pages.forEach(p=>p.classList.remove("visible"));
    document.getElementById(btn.dataset.target).classList.add("visible");
    if(btn.dataset.target==="edificios") refreshBuildingList();
    if(btn.dataset.target==="historial") renderFullHistory();
  });
});

/* CREATE GRID */
document.getElementById("startGrid").onclick=()=>{
  const name=document.getElementById("initName").value.trim();
  const rows=parseInt(document.getElementById("initRows").value);
  const cols=parseInt(document.getElementById("initCols").value);
  const mode=document.getElementById("initLabelMode").value;
  if(!name||!rows||!cols)return alert("Faltan datos.");
  buildings[name]={ rows, cols, mode,
    current:Array.from({length:rows},()=>Array(cols).fill("")),
    previous:Array.from({length:rows},()=>Array(cols).fill("")),
    history:[] };
  current=name; save(); refreshBuildingList(); loadGrid(name);
  document.querySelector("button[data-target='fumigacion']").click();
};

/* LIST BUILDINGS */
function refreshBuildingList(){
  const sel=document.getElementById("savedBuildings");
  sel.innerHTML="<option value=''>-- Seleccionar --</option>";
  Object.keys(buildings).forEach(n=>{
    const op=document.createElement("option"); op.value=op.textContent=n; sel.appendChild(op);
  });
}
document.getElementById("savedBuildings").onchange=function(){
  if(this.value){ current=this.value; loadGrid(current);
    document.querySelector("button[data-target='fumigacion']").click(); }
};

/* LOAD GRID */
function loadGrid(name){
  const data=buildings[name];
  const table=document.getElementById("gridTable");
  table.innerHTML="";

  // HEADER
  const thead=document.createElement("thead");
  const tr=document.createElement("tr");
  tr.appendChild(document.createElement("th"));
  for(let c=0;c<data.cols;c++){
    const th=document.createElement("th");
    th.textContent=data.mode==="letters"?String.fromCharCode(65+c):c+1;
    tr.appendChild(th);
  }
  thead.appendChild(tr); table.appendChild(thead);

  // BODY
  const tbody=document.createElement("tbody");
  for(let r=data.rows-1;r>=0;r--){
    const rowTR=document.createElement("tr");
    const th=document.createElement("th"); th.textContent=r+1; rowTR.appendChild(th);

    for(let c=0;c<data.cols;c++){
      const td=document.createElement("td");
      const sel=document.createElement("select");
      ["","X","-","NO","XG"].forEach(v=>{
        const o=document.createElement("option"); o.value=o.textContent=v; sel.appendChild(o);
      });
      sel.value=data.current[r][c];
      sel.onchange=()=>{ data.current[r][c]=sel.value; save(); updateStats(); };
      td.appendChild(sel); rowTR.appendChild(td);
    }
    tbody.appendChild(rowTR);
  }
  table.appendChild(tbody);
  updateStats();
}

/* STATS */
function updateStats(){
  if(!current)return;
  const cur=buildings[current].current;
  const prev=buildings[current].previous;
  const count=a=>({ X:a.flat().filter(x=>x==="X").length,
    dash:a.flat().filter(x=>x==="-").length,
    NO:a.flat().filter(x=>x==="NO").length,
    XG:a.flat().filter(x=>x==="XG").length });
  const C=count(cur),P=count(prev);
  const set=(id,v)=>document.getElementById(id).textContent=v;
  set("curX",C.X); set("curDash",C.dash); set("curNO",C.NO); set("curXG",C.XG);
  set("prevX",P.X); set("prevDash",P.dash); set("prevNO",P.NO); set("prevXG",P.XG);
  function diff(id,val){ const el=document.getElementById(id);
    el.textContent=val>0?"+"+val:val;
    el.className="diff "+(val>0?"positive":val<0?"negative":"equal"); }
  diff("diffX",C.X-P.X); diff("diffDash",C.dash-P.dash);
  diff("diffNO",C.NO-P.NO); diff("diffXG",C.XG-P.XG);
}

/* FINALIZE */
document.getElementById("finalizeSnapshot").onclick=()=>{
  if(!current)return;
  const d=buildings[current];
  d.history.push({ fecha:new Date().toLocaleString(), snapshot:JSON.parse(JSON.stringify(d.current)) });
  d.previous=JSON.parse(JSON.stringify(d.current)); save(); updateStats(); alert("Guardado.");
};

/* CLEAR GRID */
document.getElementById("clearGridBtn").onclick=()=>{
  if(!current)return;
  const d=buildings[current];
  d.current=Array.from({length:d.rows},()=>Array(d.cols).fill("")); save(); loadGrid(current);
};

/* DELETE */
document.getElementById("deleteBuilding").onclick=()=>{
  if(!current||!confirm("¿Eliminar edificio?"))return;
  delete buildings[current]; current=null; save(); refreshBuildingList();
  document.getElementById("gridTable").innerHTML="";
};

/* CSV EXPORT */
document.getElementById("exportCSV").onclick=()=>{
  if(!current)return;
  const d=buildings[current].current;
  const csv=d.map(r=>r.join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=current+".csv"; a.click(); };

/* FULL HISTORY */
function renderFullHistory(){
  const box=document.getElementById("historyList"); box.innerHTML="";
  Object.keys(buildings).forEach(name=>{
    const hist=buildings[name].history; if(hist.length===0)return;
    hist.slice().reverse().forEach((entry,i)=>{
      const div=document.createElement("div"); div.className="history-entry";
      div.innerHTML=`<h4>${name} — ${entry.fecha}</h4>
        <button class='restore-btn' data-name='${name}' data-index='${hist.length-1-i}'>Restaurar versión</button>`;
      box.appendChild(div);
    });
  });
  document.querySelectorAll(".restore-btn").forEach(btn=>{
    btn.onclick=()=>{
      const name=btn.dataset.name;
      const index=parseInt(btn.dataset.index);
      buildings[name].current=JSON.parse(JSON.stringify(buildings[name].history[index].snapshot));
      save(); current=name; loadGrid(name);
      document.querySelector("button[data-target='fumigacion']").click();
    };
  });
}
