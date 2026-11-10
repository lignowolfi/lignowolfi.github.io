// LignoWolfi Handy – Schnellvergleich. Die Datenbank wird nur aus einer Datei auf diesem iPhone gelesen
// und nur im iPhone gespeichert (IndexedDB). Es wird nichts gesendet oder hochgeladen.
(function(){
'use strict';
const q=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RDB=new Promise((res,rej)=>{try{const r=indexedDB.open('lignowolfi-ref',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('db'))r.result.createObjectStore('db')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}});
function rtx(mode,fn){return RDB.then(d=>new Promise((res,rej)=>{const tx=d.transaction('db',mode);const r=fn(tx.objectStore('db'));let out;if(r)r.onsuccess=()=>{out=r.result};tx.oncomplete=()=>res(out);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)}))}
const rget=k=>rtx('readonly',o=>o.get(k)),rput=(k,v)=>rtx('readwrite',o=>o.put(v,k)),rdel=k=>rtx('readwrite',o=>o.delete(k));

let DB=null,WK=null,VGL=null,PROBE=null,TAB='B',JAHR=null,LAEUFT=false,STAND='',GELADEN=false,LADEN=null;

// Panel und Datei-Auswahl einhängen
const css=document.createElement('style');css.textContent=`
#vglH{position:absolute;inset:0;overflow:auto;-webkit-overflow-scrolling:touch;background:#fbfbfb;z-index:6;display:none;font-size:13px;padding-bottom:20px}
#vglH .kopf{position:sticky;top:0;background:var(--leiste);border-bottom:1px solid var(--rand);padding:6px 10px;display:flex;gap:6px;align-items:center;z-index:2}
#vglH .kopf b{margin-right:auto;font-size:15px}
#vglH .db{padding:8px 10px;color:#444;border-bottom:1px solid #ddd;line-height:1.5}
#vglH section{padding:6px 10px}
#vglH h3{font-size:12px;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.05em;color:#555;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#vglH h3 button{min-height:32px;font-size:12px;text-transform:none;letter-spacing:0}
#vglH table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
#vglH th,#vglH td{border-bottom:1px solid #e3e3e3;padding:5px 4px;text-align:right;white-space:nowrap;vertical-align:top}
#vglH th{background:#f1f3f5;font-weight:600;font-size:12px}
#vglH td.l,#vglH th.l{text-align:left;white-space:normal}
#vglH tr.gut td{background:#eef7ee}
#vglH tr.cnt.wahl td{background:#cce4f7;font-weight:600}
#vglH .kn{font-family:Menlo,monospace;font-size:13px;color:#000;text-decoration:underline dotted #999;touch-action:none;-webkit-touch-callout:none;display:inline-block;padding:2px 0}
#vglH .in{display:block;color:#1a4d80;font-size:11.5px;margin-top:1px}
#vglH .hinweis{color:#555;line-height:1.45}
#vglH .tabs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
#vglH .tabs button[aria-pressed=true]{background:var(--akzent2);border-color:var(--akzent)}
#vglPlotH{position:fixed;left:4px;right:4px;top:calc(env(safe-area-inset-top,0px) + 50px);z-index:60;display:none;background:#fff;border:1px solid #888;box-shadow:0 4px 18px rgba(0,0,0,.35);pointer-events:none}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.id='vglH';q('feld').appendChild(panel);
const plot=document.createElement('canvas');plot.id='vglPlotH';document.body.appendChild(plot);
const fin=document.createElement('input');fin.type='file';fin.id='refdatei';fin.style.display='none';document.body.appendChild(fin);
const btn=document.createElement('button');btn.id='bVgl';btn.textContent='Vergleich';btn.title='Schnellvergleich mit deiner Datenbank';q('oben').appendChild(btn);

function breitenH(x){if(!META||!META.seiten[x])return null;const P=PTS[x],mm=MM(x),w=[];for(let i=1;i<P.length;i++){if(P[i][2])continue;w.push(Math.abs(P[i][1]-P[i-1][1])*mm)}return w}

function worker(){if(WK)return WK;WK=new Worker('vgl-worker.js');WK.onmessage=e=>{const m=e.data;
  if(m.typ==='stand'){STAND=m.text;const el=q('vStandH');if(el)el.textContent=m.text}
  else if(m.typ==='refs-ok'){GELADEN=true}
  else if(m.typ==='vgl-ok'){LAEUFT=false;VGL=m;JAHR=null;zeigen()}};
  return WK}
async function dbStart(){if(LADEN)return LADEN;LADEN=(async()=>{try{DB=await rget('referenzen')||null}catch(e){DB=null}
  if(DB){worker().postMessage({typ:'refs',refs:DB.datiert.concat(DB.undatiert)})}})();return LADEN}

btn.onclick=async()=>{if(typeof schliesseBlatt==='function')schliesseBlatt();await dbStart();panel.style.display='block';zeigen()};
fin.onchange=async()=>{const f=fin.files&&fin.files[0];fin.value='';if(!f)return;const st=q('vEinH');if(st)st.textContent='lese '+f.name+' …';
  try{const t=await f.text();const d=JSON.parse(t);if(d.format!=='lignowolfi-referenzen'||!Array.isArray(d.datiert))throw new Error('Das ist keine LignoWolfi-Datenbank. Am PC in LignoWolfi im Schnellvergleich „Fürs Handy speichern…“ benutzen.');
   d.geladen=new Date().toISOString();d.datei=f.name;await rput('referenzen',d);DB=d;LADEN=Promise.resolve();VGL=null;GELADEN=false;worker().postMessage({typ:'refs',refs:DB.datiert.concat(DB.undatiert)});zeigen()}
  catch(e){if(st)st.textContent='';alert(e.message||String(e))}};

function zeigen(){const nd=DB?DB.datiert.length:0,nu=DB?DB.undatiert.length:0;
 let h=`<div class="kopf"><b>Schnellvergleich</b><button id="vStartH">Vergleichen</button><button id="vZuH">Schließen</button></div>
 <div class="db">${DB?`Datenbank im iPhone: <b>${nd}</b> datierte, <b>${nu}</b> undatierte Kurven<br><span style="color:#777">vom PC ${esc(new Date(DB.exportiert||DB.erstellt).toLocaleString('de-DE'))} · ${esc(DB.datei||'')}</span>`:'<b>Noch keine Datenbank im iPhone.</b><br>Am PC in LignoWolfi im Schnellvergleich „Fürs Handy speichern…“ wählen. Dann hier die Datei aus OneDrive laden. Sie bleibt nur in diesem iPhone.'}
 <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button id="vLadH">${DB?'Datenbank neu laden':'Datenbank laden'}</button>${DB?'<button id="vDelH">Aus iPhone löschen</button>':''}<label>min. Überl. <input id="vMinH" type="number" inputmode="numeric" value="${esc(localStorage.getItem('lwh_minueb')||40)}" style="width:52px;font-size:16px"></label><span id="vEinH"></span></div></div>`;
 if(LAEUFT)h+=`<section><span id="vStandH">${esc(STAND||'vergleiche …')}</span></section>`;
 else if(VGL){const o=VGL.out,bt=VGL.bt;h+='<section>';
  if(bt)h+=`<div class="hinweis">Bass ↔ Diskant: Diskant beginnt ${bt.lage>=0?bt.lage+' Ringe nach':(-bt.lage)+' Ringe vor'} dem Bass · tBP ${bt.tbp.toFixed(1)} · tHo ${bt.tho.toFixed(1)} · GLK ${bt.glk.toFixed(0)} % · Überl. ${bt.ueb}${bt.tbp<4?' – zu schwach, keine Mittelkurve':''}</div>`;
  h+='<div class="tabs">'+['B','T','M'].filter(k=>o[k]).map(k=>`<button class="vTabH" data-k="${k}" aria-pressed="${TAB===k}">${{B:'Bass',T:'Diskant',M:'Mittelkurve'}[k]} (${o[k].ringe})</button>`).join('')+`<span style="color:#777;align-self:center">${(VGL.ms/1000).toFixed(1)} s</span></div>`;
  const r=o[TAB]||o.B||o.T;if(r){
   h+=`<h3>Count (Endjahre unter den besten 100)</h3><table><tr><th>Endjahr</th><th>Count</th><th>bester tBP</th></tr>`+r.count.map(c=>`<tr class="cnt ${c.count>=10?'gut':''} ${JAHR===c.endjahr?'wahl':''}" data-j="${c.endjahr}"><td>${c.endjahr}</td><td>${c.count}</td><td>${c.bestT.toFixed(1)}</td></tr>`).join('')+'</table><div class="hinweis" style="margin-top:4px">Endjahr antippen: unten nur diese Treffer.</div>';
   const dl=JAHR!=null?r.datiert.filter(e=>e.endjahr===JAHR):r.datiert.slice(0,30);
   h+=`<h3>Datiert – beste Treffer${JAHR!=null?` mit Endjahr ${JAHR} (${dl.length}) <button id="vAlleH">alle zeigen</button>`:''}</h3><table><tr><th class="l">Kurve</th><th>tBP</th><th>tHo</th><th>GLK</th><th>Üb.</th><th>Ende</th></tr>`+dl.map(e=>zeile(e,`Endjahr ${e.endjahr}`,e.endjahr)).join('')+'</table>';
   h+=`<h3>Undatiert – beste Treffer</h3><table><tr><th class="l">Kurve</th><th>tBP</th><th>tHo</th><th>GLK</th><th>Üb.</th><th>Lage</th></tr>`+r.undatiert.slice(0,30).map(e=>zeile(e,`Lage ${e.lage>0?'+':''}${e.lage}`,(e.lage>0?'+':'')+e.lage)).join('')+'</table><div class="hinweis">Lage: um wie viele Ringe deine Kurve nach (+) bzw. vor (−) dem Anfang der Vergleichskurve beginnt.</div>';
   h+='<div class="hinweis" style="margin-top:8px">Finger auf einen Kurvennamen legen und halten: beide Kurven im Vergleich.</div>'}
  h+='</section>'}
 else h+=`<section class="hinweis">${DB?'„Vergleichen“ rechnet Bass, Diskant und – wenn B und T zusammenpassen – die Mittelkurve gegen die Datenbank im iPhone.':''}</section>`;
 panel.innerHTML=h;
 q('vZuH').onclick=()=>{panel.style.display='none'};
 q('vLadH').onclick=()=>fin.click();
 const del=q('vDelH');if(del)del.onclick=async()=>{if(!confirm('Datenbank aus diesem iPhone löschen? (Deine Messungen bleiben.)'))return;await rdel('referenzen');DB=null;VGL=null;if(WK){WK.terminate();WK=null}LADEN=null;zeigen()};
 q('vMinH').onchange=e=>{try{localStorage.setItem('lwh_minueb',e.target.value)}catch(_){}};
 q('vStartH').onclick=()=>{if(!DB){alert('Erst die Datenbank laden');return}const B=breitenH('B'),T=breitenH('T');if(!(B&&B.length>=20)&&!(T&&T.length>=20)){alert('Zu wenige Ringe gemessen (mind. 20)');return}
  LAEUFT=true;STAND='';TAB=B&&B.length>=20?'B':'T';PROBE={B,T,key:typeof KEY!=='undefined'?KEY:''};zeigen();worker().postMessage({typ:'vgl',B,T,minUeb:Math.max(20,+q('vMinH').value||40)})};
 panel.querySelectorAll('.vTabH').forEach(b=>b.onclick=()=>{TAB=b.dataset.k;JAHR=null;zeigen()});
 panel.querySelectorAll('tr.cnt').forEach(tr=>tr.onclick=()=>{const j=+tr.dataset.j;JAHR=JAHR===j?null:j;zeigen()});
 const al=q('vAlleH');if(al)al.onclick=()=>{JAHR=null;zeigen()};
 panel.querySelectorAll('.kn').forEach(sp=>{sp.addEventListener('pointerdown',ev=>{ev.preventDefault();try{sp.setPointerCapture(ev.pointerId)}catch(_){}kurven(sp)});sp.addEventListener('contextmenu',ev=>ev.preventDefault())});
}
function zeile(e,w,letzte){const n=DB&&DB.namen&&DB.namen[e.name]||[];const ins=n.filter(x=>!x.startsWith('Dendro'));const z=ins.length?ins:n;
 const inst=z.length?z[0].replace(/\s+\[/,' [')+(z.length>1?' (+'+(z.length-1)+')':''):'';
 return `<tr class="${e.tbp>=6?'gut':''}"><td class="l"><span class="kn" data-ri="${e.ri}" data-d="${e.d}" data-k="${esc(e.name)}" data-i="${esc(inst)}" data-w="tBP ${e.tbp.toFixed(1)} · tHo ${e.tho.toFixed(1)} · GLK ${e.glk.toFixed(0)} % · Überl. ${e.ueb} · ${esc(w)}">${esc(e.name)}</span>${e.chrono?' (Chr.)':''}${inst?`<span class="in">${esc(inst)}</span>`:''}</td><td>${e.tbp.toFixed(1)}</td><td>${e.tho.toFixed(1)}</td><td>${e.glk.toFixed(0)}</td><td>${e.ueb}</td><td>${letzte}</td></tr>`}

function weg(){plot.style.display='none'}
addEventListener('pointerup',weg);addEventListener('pointercancel',weg);addEventListener('blur',weg);
document.addEventListener('visibilitychange',weg);

function kurven(sp){if(!DB||!VGL)return;const refs=DB.datiert.concat(DB.undatiert);const r=refs[+sp.dataset.ri];if(!r)return;
 const d=+sp.dataset.d,k=TAB;const P=k==='M'?(VGL.bt&&VGL.bt.mittel):(PROBE&&PROBE[k]);if(!P||!r.vals)return;
 const W=Math.max(300,innerWidth-8),H=Math.min(Math.round(innerHeight*0.55),Math.round(W*0.75)),dpr=devicePixelRatio||1;
 plot.width=W*dpr;plot.height=H*dpr;plot.style.width=W+'px';plot.style.height=H+'px';plot.style.display='block';
 const g=plot.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#fff';g.fillRect(0,0,W,H);
 const R=r.vals,pl=P.length,rl=R.length,x0=Math.min(0,-d),x1=Math.max(pl-1,rl-1-d);
 let sl=0,n=0;for(let i=Math.max(0,-d);i<Math.min(pl,rl-d);i++){const a=P[i],b=R[i+d];if(a>0&&b>0){sl+=Math.log(a)-Math.log(b);n++}}const f=n?Math.exp(sl/n):1;
 const allv=[];P.forEach(v=>{if(v>0)allv.push(v)});R.forEach(v=>{if(v>0)allv.push(v*f)});if(!allv.length)return;
 let lo=Math.log10(Math.min(...allv)),hi=Math.log10(Math.max(...allv));if(hi-lo<0.3){lo-=0.15;hi+=0.15}
 const fs=W<500?10:11,L=W<500?34:52,Rt=8,T=86,B=26,pw=W-L-Rt,ph=H-T-B;
 const X=x=>L+(x-x0)/Math.max(1,x1-x0)*pw,Y=v=>T+ph-(Math.log10(v)-lo)/(hi-lo)*ph;
 const dat=r.start!=null,yr=x=>r.start+d+x;
 g.fillStyle='#f3f6fa';g.fillRect(X(Math.max(0,-d)),T,X(Math.min(pl,rl-d)-1)-X(Math.max(0,-d)),ph);
 g.font=fs+'px -apple-system,Segoe UI,sans-serif';g.strokeStyle='#e2e2e2';g.fillStyle='#666';g.lineWidth=1;
 for(let e=Math.floor(lo);e<=Math.ceil(hi);e++)for(const m of(hi-lo<1.2?[1,2,3,4,5,6,7,8,9]:[1,2,5])){const v=m*Math.pow(10,e),lv=Math.log10(v);if(lv<lo||lv>hi)continue;const y=Y(v);g.beginPath();g.moveTo(L,y);g.lineTo(L+pw,y);g.stroke();g.textAlign='right';g.fillText(String(+v.toPrecision(2)),L-3,y+3)}
 const span=x1-x0,step=span>300?100:span>150?50:span>60?20:10;g.textAlign='center';
 for(let x=x0;x<=x1;x++){const lab=dat?yr(x):x+1;if(lab%step!==0)continue;const xx=X(x);g.strokeStyle='#e2e2e2';g.beginPath();g.moveTo(xx,T);g.lineTo(xx,T+ph);g.stroke();g.fillText(String(lab),xx,T+ph+13)}
 g.strokeStyle='#999';g.strokeRect(L,T,pw,ph);
 const linie=(arr,off,mul,col,lw)=>{g.strokeStyle=col;g.lineWidth=lw;g.beginPath();let pen=false;for(let i=0;i<arr.length;i++){const v=arr[i]*mul;if(!(v>0)){pen=false;continue}const xx=X(i-off),yy=Y(v);if(pen)g.lineTo(xx,yy);else g.moveTo(xx,yy);pen=true}g.stroke()};
 linie(R,d,f,'#1f4fbf',1.2);linie(P,0,1,'#d01818',1.4);
 const lbl={B:'Bass',T:'Diskant',M:'Mittelkurve'}[k];
 g.textAlign='left';g.fillStyle='#000';g.font='bold '+(fs+2)+'px -apple-system,Segoe UI,sans-serif';g.fillText(lbl+' ↔ '+sp.dataset.k,6,16);
 g.font=fs+'px -apple-system,Segoe UI,sans-serif';g.fillStyle='#333';g.fillText(sp.dataset.w,6,31);g.fillStyle='#d01818';g.fillText('deine Kurve: '+(typeof KEY!=='undefined'&&KEY?KEY+' ':'')+lbl+(dat?' · '+yr(0)+'–'+yr(pl-1):' · '+pl+' Ringe'),6,45);
 g.fillStyle='#1f4fbf';const ref='Referenz: '+(r.datei||r.name)+' · '+(r.ordner||'–')+' · '+(dat?r.start+'–'+(r.start+rl-1):rl+' Ringe')+(Math.abs(Math.log10(f))>0.05?' · Höhe angepasst':'');g.fillText(ref.length>110?ref.slice(0,108)+'…':ref,6,59);
 if(sp.dataset.i){g.fillStyle='#1a4d80';const t=sp.dataset.i;g.fillText(t.length>90?t.slice(0,88)+'…':t,6,73)}
 g.textAlign='right';g.fillStyle='#d01818';g.fillText('— '+lbl,W-Rt-70,16);g.fillStyle='#1f4fbf';g.fillText('— Ref.',W-Rt,16)}
})();
