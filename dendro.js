// LignoWolfi – Schnellvergleich (nur lokal, keine Netzverbindung)
// Einlesen: Tucson .rwl (auch ITRDB *_rwl.txt / *_tuc.txt), Tucson .crn, Heidelberg .fh
// Statistik: tBP (Baillie/Pilcher 1973), tHo (Hollstein 1980), Gleichlaeufigkeit, Ueberlappung, Endjahr, Count
(function(root){
'use strict';

// ---------- Einlesen ----------
function zahl(s){s=String(s).trim();if(!/^-?\d+$/.test(s))return null;return parseInt(s,10)}

// Tucson-Ringbreiten: Spalten 1-8 Kennung, 9-12 Jahr, dann bis zu 10 Werte zu je 6 Zeichen. 999 bzw. -9999 = Ende.
function parseTucsonRwl(text){
  const lines=text.split(/\r?\n/);const ser=new Map();
  for(const raw of lines){const l=raw.replace(/\s+$/,'');if(l.length<14)continue;
    let id=null,yr=null,vals=null;
    // feste Spalten
    const y1=zahl(l.slice(8,12));
    if(y1!==null){const rest=l.slice(12);const v=[];let ok=true;for(let p=0;p<rest.length;p+=6){const f=rest.slice(p,p+6);if(!f.trim())continue;const z=zahl(f);if(z===null){ok=false;break}v.push(z)}
      if(ok&&v.length>0&&v.length<=10){id=l.slice(0,8).trim();yr=y1;vals=v}}
    if(vals===null){ // freie Form: Kennung Jahr Werte…
      const m=l.match(/^(\S+)\s+(-?\d{1,4})((?:\s+-?\d+){1,10})$/);if(m){id=m[1];yr=parseInt(m[2],10);vals=m[3].trim().split(/\s+/).map(Number)}}
    if(vals===null||!id)continue;
    let s=ser.get(id);if(!s){s={id,start:yr,vals:[],ende:null,einheit:0.01};ser.set(id,s)}
    if(s.ende)continue;
    // Luecken/Spruenge: Jahr muss passen
    const erw=s.start+s.vals.length;if(yr>erw){for(let k=erw;k<yr;k++)s.vals.push(NaN)}else if(yr<erw&&s.vals.length){continue}
    for(const v of vals){if(v===999){s.ende=true;s.einheit=0.01;break}if(v===-9999){s.ende=true;s.einheit=0.001;break}s.vals.push(v<0?NaN:v)}}
  const out=[];for(const s of ser.values()){const v=s.vals.map(x=>isNaN(x)?NaN:x*s.einheit);while(v.length&&isNaN(v[v.length-1]))v.pop();if(v.filter(x=>!isNaN(x)).length>=20)out.push({name:s.id,start:s.start,vals:v})}
  return out}

// Tucson-Chronologie: Spalten 1-6 Kennung, 7-10 Jahr, dann 10 Paare (4 Wert + 3 Belegung). 9990 = fehlt.
function parseTucsonCrn(text){
  const lines=text.split(/\r?\n/);const ser=new Map();
  for(const raw of lines){const l=raw.replace(/\s+$/,'');if(l.length<17)continue;const yr=zahl(l.slice(6,10));if(yr===null)continue;
    const rest=l.slice(10);const v=[];let ok=true;for(let p=0;p+7<=rest.length+3&&p<70;p+=7){const f=rest.slice(p,p+4);if(!f.trim())break;const z=zahl(f);if(z===null){ok=false;break}v.push(z)}
    if(!ok||!v.length)continue;const id=l.slice(0,6).trim()||'crn';let s=ser.get(id);if(!s){s={id,start:yr,vals:[]};ser.set(id,s)}
    const erw=s.start+s.vals.length;if(yr<erw)continue;for(let k=erw;k<yr;k++)s.vals.push(NaN);
    for(const z of v)s.vals.push(z===9990||z<=0?NaN:z/1000)}
  const out=[];for(const s of ser.values()){const v=s.vals;while(v.length&&isNaN(v[v.length-1]))v.pop();if(v.filter(x=>!isNaN(x)).length>=20)out.push({name:s.id,start:s.start,vals:v,chrono:true})}
  return out}

// Heidelberg .fh: Kopf mit KeyCode, DateBegin, Dated, Unit; DATA:Single (ein Wert je Zeile oder mehrere)
function parseFh(text){
  const out=[];const bl=text.split(/(?=^HEADER:)/m);
  for(const b of bl){if(!/DATA:/i.test(b))continue;const h={};const [kopf,daten]=b.split(/^DATA:[^\r\n]*\r?\n?/m);
    for(const l of kopf.split(/\r?\n/)){const m=l.match(/^([A-Za-z]+)=(.*)$/);if(m)h[m[1]]=m[2].trim()}
    let unit=0.01;if(/1\/1000/.test(h.Unit||''))unit=0.001;else if(/1\/10\b/.test(h.Unit||''))unit=0.1;
    const vals=[];for(const l of (daten||'').split(/\r?\n/)){const t=l.split(';;')[0].trim();if(!t)continue;if(/^HEADER/i.test(t))break;for(const w of t.split(/\s+/)){const z=zahl(w);if(z===null)continue;vals.push(z<=0?NaN:z*unit)}}
    const dated=/^dated$/i.test(h.Dated||'')||(/^\d+$/.test(h.DateBegin||'')&&!/undated/i.test(h.Dated||'')&&+h.DateBegin>1);
    if(vals.length>=20)out.push({name:h.KeyCode||'fh',start:dated?+h.DateBegin:null,vals})}
  return out}

function parseDatei(name,text){const n=name.toLowerCase();try{
  if(n.endsWith('.crn'))return parseTucsonCrn(text);
  if(n.endsWith('.fh')||/^HEADER:/m.test(text.slice(0,2000)))return parseFh(text);
  if(n.endsWith('.rwl')||n.endsWith('.txt')||n.endsWith('.tuc'))return parseTucsonRwl(text);
 }catch(e){}return[]}

// ---------- Transformationen ----------
const EPS=0.001;
function bp(v){const n=v.length,o=new Float64Array(n).fill(NaN);for(let i=2;i<n-2;i++){let s=0,ok=true;for(let k=-2;k<=2;k++){const x=v[i+k];if(!(x>0)){ok=false;break}s+=x}if(ok&&v[i]>0)o[i]=Math.log(100*v[i]/(s/5))}return o}
function ho(v){const n=v.length,o=new Float64Array(n).fill(NaN);for(let i=1;i<n;i++){const a=v[i-1],b=v[i];if(a>0&&b>0)o[i]=100*Math.log(b/a)}return o}
function vorbereiten(s){const v=s.vals.map(x=>x>0?x:(x===0?EPS:NaN));return Object.assign({},s,{vals:v,bp:bp(v),ho:ho(v)})}

function tWert(r,n){if(n<3||!isFinite(r))return 0;if(r>=0.99999)r=0.99999;return r*Math.sqrt(n-2)/Math.sqrt(1-r*r)}
function korr(a,b,ia,ib,len){let n=0,sa=0,sb=0,saa=0,sbb=0,sab=0;for(let k=0;k<len;k++){const x=a[ia+k],y=b[ib+k];if(x!==x||y!==y)continue;n++;sa+=x;sb+=y;saa+=x*x;sbb+=y*y;sab+=x*y}
  if(n<3)return{r:0,n};const cov=sab-sa*sb/n,va=saa-sa*sa/n,vb=sbb-sb*sb/n;if(va<=0||vb<=0)return{r:0,n};return{r:cov/Math.sqrt(va*vb),n}}
function glk(a,b,ia,ib,len){let g=0,n=0;for(let k=1;k<len;k++){const a0=a[ia+k-1],a1=a[ia+k],b0=b[ib+k-1],b1=b[ib+k];if(!(a0>0&&a1>0&&b0>0&&b1>0))continue;const da=Math.sign(a1-a0),db=Math.sign(b1-b0);n++;if(da===db)g+=1;else if(da===0||db===0)g+=0.5}return n?100*g/n:0}

// Probe gegen Referenz an Lage d (Probe beginnt d Ringe nach Referenzbeginn)
function vergleichLage(p,r,d){const ip=Math.max(0,-d),ir=Math.max(0,d);const len=Math.min(p.vals.length-ip,r.vals.length-ir);if(len<=0)return null;
  const cb=korr(p.bp,r.bp,ip,ir,len),ch=korr(p.ho,r.ho,ip,ir,len);
  return{d,ueb:len,tbp:tWert(cb.r,cb.n),tho:tWert(ch.r,ch.n),nbp:cb.n,glk:glk(p.vals,r.vals,ip,ir,len)}}

// alle Lagen; nur Lagen mit genug Ueberlappung; Rueckgabe: beste Treffer je Referenz (bis zu k)
function alleLagen(p,r,minUeb,k){const out=[];for(let d=-(p.vals.length-minUeb);d<=r.vals.length-minUeb;d++){const ip=Math.max(0,-d),ir=Math.max(0,d);const len=Math.min(p.vals.length-ip,r.vals.length-ir);if(len<minUeb)continue;
  const cb=korr(p.bp,r.bp,ip,ir,len);const tb=tWert(cb.r,cb.n);if(tb<2.5||cb.n<minUeb-6)continue;out.push({d,tbp:tb,len})}
  out.sort((a,b)=>b.tbp-a.tbp);return out.slice(0,k).map(o=>vergleichLage(p,r,o.d))}

// ---------- Schnellvergleich ----------
// probe: {name, vals}; refs: [{name, ordner, start|null, vals, chrono}]
function schnellvergleich(probe,refs,opt){opt=Object.assign({minUeb:40,top:30,countTop:100},opt||{});
  const p=vorbereiten({name:probe.name,start:null,vals:probe.vals});const dat=[],und=[];
  for(let ri=0;ri<refs.length;ri++){const r0=refs[ri];const r=r0._v||(r0._v=vorbereiten(r0));if(r===p)continue;const hits=alleLagen(p,r,opt.minUeb,3);
    for(const h of hits){if(!h)continue;const e={ri,name:r0.name,ordner:r0.ordner||'',chrono:!!r0.chrono,tbp:h.tbp,tho:h.tho,glk:h.glk,ueb:h.ueb,d:h.d};
      if(r0.start!=null){e.endjahr=r0.start+h.d+p.vals.length-1;dat.push(e)}else{e.lage=h.d;und.push(e)}}}
  dat.sort((a,b)=>b.tbp-a.tbp);und.sort((a,b)=>b.tbp-a.tbp);
  const cnt=new Map();for(const e of dat.slice(0,opt.countTop))cnt.set(e.endjahr,(cnt.get(e.endjahr)||0)+1);
  const count=[...cnt.entries()].map(([j,c])=>({endjahr:j,count:c,bestT:Math.max(...dat.slice(0,opt.countTop).filter(e=>e.endjahr===j).map(e=>e.tbp))})).sort((a,b)=>b.count-a.count||b.bestT-a.bestT);
  return{datiert:dat.slice(0,Math.max(opt.top,opt.countTop)),undatiert:und.slice(0,opt.top),count:count.slice(0,10),nRefs:refs.length,ringe:p.vals.length}}

// B und T zueinander legen, Mittelkurve bilden (Lage d: T beginnt d Ringe nach B)
function btMittel(b,t,minUeb){minUeb=minUeb||30;const B=vorbereiten({vals:b}),T=vorbereiten({vals:t});let best=null;
  for(let d=-(t.length-minUeb);d<=b.length-minUeb;d++){const v=vergleichLage(T,B,d);if(v&&v.ueb>=minUeb&&(!best||v.tbp>best.tbp))best=v}
  if(!best)return null;const d=best.d;const s0=Math.min(0,d),e0=Math.max(b.length,d+t.length);const m=[];
  for(let i=s0;i<e0;i++){const x=i>=0&&i<b.length?b[i]:NaN,y=i-d>=0&&i-d<t.length?t[i-d]:NaN;const w=[x,y].filter(z=>z>0);m.push(w.length?w.reduce((a,c)=>a+c,0)/w.length:NaN)}
  return{lage:d,tbp:best.tbp,tho:best.tho,glk:best.glk,ueb:best.ueb,mittel:m}}

const api={parseTucsonRwl,parseTucsonCrn,parseFh,parseDatei,vorbereiten,vergleichLage,schnellvergleich,btMittel,tWert,korr,glk};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Dendro=api;
})(typeof self!=='undefined'?self:this);
