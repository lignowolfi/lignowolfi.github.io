// LignoWolfi Handy – Instrument selbst fotografieren (Versuch).
// Ablauf: Angaben (Name, untere Gesamtbreite, Richtung B/T) -> Kamera mit Live-Anleitung -> 3 Punkte tippen -> B/T-Bilder -> messen.
// Alles bleibt im iPhone. Nichts wird gesendet.
(function(){
'use strict';
const q=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const css=document.createElement('style');css.textContent=`
#fotoW{position:fixed;inset:0;z-index:70;background:#111;color:#fff;display:none;font-size:15px}
#fotoW .seite{position:absolute;inset:0;overflow:auto;background:var(--grund);color:var(--text);padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 30px}
#fotoW h2{margin:4px 0 12px;font-size:20px}
#fotoW label.f{display:block;margin:12px 0 4px;font-weight:600}
#fotoW input[type=text],#fotoW input[type=number]{font-size:17px;padding:8px;width:100%;box-sizing:border-box;border:1px solid var(--rand);border-radius:8px}
#fotoW .kacheln{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#fotoW .kachel{border:3px solid transparent;border-radius:10px;padding:0;background:#fff;overflow:hidden;min-height:0}
#fotoW .kachel img{width:100%;display:block}
#fotoW .kachel[aria-pressed=true]{border-color:var(--akzent)}
#fotoW .weissnicht{margin-top:6px;width:100%}
#fotoW .weissnicht[aria-pressed=true]{background:var(--akzent2);border-color:var(--akzent)}
#fotoW .knopfzeile{display:flex;gap:8px;margin-top:18px}
#fotoW .knopfzeile button{flex:1;min-height:48px;font-size:17px}
#fotoW .haupt{background:var(--akzent);color:#fff;border-color:var(--akzent)}
#fotoW video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}
#fotoW canvas.voll{position:absolute;left:0;right:0;top:0;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);width:100%;height:calc(100% - env(safe-area-inset-bottom,0px) - 96px);background:#000}
#fotoW .unten.fest{background:#000}
#fotoW .rahmen{position:absolute;inset:6% 8%;border:3px dashed rgba(255,255,255,.55);border-radius:40% 40% 44% 44%/22% 22% 26% 26%;pointer-events:none;transition:border-color .2s}
#fotoW .rahmen.ok{border-color:#2fd35a;border-style:solid}
#fotoW .ansage{position:absolute;left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 10px);background:rgba(0,0,0,.72);border-radius:12px;padding:12px 14px;font-size:22px;font-weight:700;text-align:center;line-height:1.25}
#fotoW .ansage.ok{background:rgba(20,140,50,.88)}
#fotoW .seitenkopf{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 180px);text-align:center;font-size:17px;font-weight:700;text-shadow:0 1px 3px #000}
#fotoW .ansage small{display:block;font-size:14px;font-weight:400;margin-top:4px;opacity:.85}
#fotoW .unten{position:absolute;left:0;right:0;bottom:0;padding:10px 8px calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center;background:linear-gradient(transparent,rgba(0,0,0,.6))}
#fotoW .ausl{width:76px;height:76px;border-radius:50%;border:5px solid #fff;background:rgba(255,255,255,.25);font-size:0}
#fotoW .ausl.ok{background:#2fd35a}
#fotoW .klein{min-height:44px;background:rgba(255,255,255,.9)}
#fotoW .klein.haupt{background:var(--akzent);color:#fff}
#fotoW .punkt{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border:3px solid #ff3b30;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px #fff}
#fotoW .punkt::after{content:'';position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;background:#ff3b30;border-radius:50%}
#fotoW .lupe{position:absolute;width:150px;height:150px;border-radius:50%;border:3px solid #fff;overflow:hidden;pointer-events:none;display:none;box-shadow:0 2px 12px rgba(0,0,0,.6)}
#fotoW .lupe canvas{width:100%;height:100%}
`;document.head.appendChild(css);
const W0=document.createElement('div');W0.id='fotoW';document.body.appendChild(W0);
const fin=document.createElement('input');fin.type='file';fin.accept='image/*';fin.setAttribute('capture','environment');fin.style.display='none';document.body.appendChild(fin);
const fin2=document.createElement('input');fin2.type='file';fin2.accept='image/*';fin2.style.display='none';document.body.appendChild(fin2);

let A={kurz:'',breite:'',richtung:{B:null,T:null}},STREAM=null,LOOP=null,ORI={beta:null,gamma:null},FOTOS2={};
const ICON={normal:'sym_normal.png',umgekehrt:'sym_umgekehrt.png'};

// Knopf auf der Startseite
const sb=document.createElement('button');sb.className='gross';sb.id='bFoto';sb.textContent='Instrument fotografieren';sb.style.marginLeft='8px';
const ob=q('bOpen2');if(ob&&ob.parentNode)ob.parentNode.insertBefore(sb,ob.nextSibling);
sb.onclick=()=>{W0.style.display='block';schritt1()};

function zu(){stopp();W0.style.display='none';W0.innerHTML=''}
function stopp(){if(LOOP){cancelAnimationFrame(LOOP);LOOP=null}if(STREAM){STREAM.getTracks().forEach(t=>t.stop());STREAM=null}}

// ---------- Schritt 1: Angaben ----------
function kachelnHtml(s){const r=A.richtung[s];return `<div class="kacheln">`+['normal','umgekehrt'].map(k=>`<button class="kachel" data-s="${s}" data-k="${k}" aria-pressed="${r===k}" aria-label="${k==='normal'?'Kante zur Fuge':'Kante zum Rand'}"><img src="${ICON[k]}" alt=""></button>`).join('')+`</div><button class="weissnicht" data-s="${s}" data-k="?" aria-pressed="${r==='?'}">Weiß nicht</button>`}
function schritt1(){
 W0.innerHTML=`<div class="seite"><h2>Instrument fotografieren</h2>
 <label class="f">Name des Instruments</label><input type="text" id="fKurz" placeholder="z. B. Gagliano" value="${esc(A.kurz)}" autocomplete="off">
 <label class="f">Untere Breite, ganz (mm)</label><input type="number" id="fBreite" inputmode="decimal" placeholder="z. B. 206" value="${esc(A.breite)}">
 <label class="f">Bass – wo liegt die scharfe Kante?</label>${kachelnHtml('B')}
 <label class="f">Diskant – wo liegt die scharfe Kante?</label>${kachelnHtml('T')}
 <div class="knopfzeile"><button id="fAbbr">Abbrechen</button><button id="fWeiter" class="haupt">Weiter</button></div></div>`;
 W0.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{A.kurz=q('fKurz').value;A.breite=q('fBreite').value;A.richtung[b.dataset.s]=b.dataset.k;schritt1()});
 q('fAbbr').onclick=zu;
 q('fWeiter').onclick=()=>{A.kurz=q('fKurz').value.trim();A.breite=q('fBreite').value.replace(',','.');const br=+A.breite;
  if(!A.kurz){alert('Bitte einen Namen eingeben');return}if(!(br>=120&&br<=520)){alert('Bitte die untere Breite in Millimetern eingeben (Geige etwa 200–210, Bratsche 230–260, Cello 330–360)');return}
  if(!A.richtung.B||!A.richtung.T){alert('Bitte für Bass und Diskant die Richtung wählen (oder „Weiß nicht“)');return}
  FOTOS2={};kamera('B')};
}


// ---------- Schritt 2: Kamera mit Live-Anleitung, je Seite ein Foto der unteren Hälfte ----------
const SN={B:'Bassseite',T:'Diskantseite'};
async function kamera(seite){
 W0.innerHTML=`<video playsinline muted autoplay></video>
 <div class="ansage" id="fAns">Kamera wird gestartet …</div>
 <div class="seitenkopf" id="fKopf">${SN[seite]}, unterer Teil</div>
 <div class="unten"><button class="klein" id="fZur">Zurück</button><button class="ausl" id="fAusl" aria-label="Auslösen">Foto</button><button class="klein" id="fApp">Kamera-App</button><button class="klein" id="fWahl">Vorhandenes Foto</button></div>`;
 q('fZur').onclick=()=>{stopp();if(seite==='T')kamera('B');else schritt1()};
 fin.onchange=()=>{const f=fin.files&&fin.files[0];fin.value='';if(f)fotoDa(f,seite);else kamera(seite)};
 q('fApp').onclick=()=>{stopp();fin.click()};
 fin2.onchange=()=>{const f=fin2.files&&fin2.files[0];fin2.value='';if(f)fotoDa(f,seite);else kamera(seite)};
 q('fWahl').onclick=()=>{stopp();fin2.click()};
 try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission)await DeviceOrientationEvent.requestPermission()}catch(e){}
 addEventListener('deviceorientation',e=>{ORI={beta:e.beta,gamma:e.gamma}});
 const v=W0.querySelector('video');
 try{STREAM=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:3840},height:{ideal:2160}}});v.srcObject=STREAM;await v.play()}
 catch(e){q('fAns').innerHTML='Kamera nicht verfügbar<small>Tippe auf „Kamera-App“ oder „Vorhandenes Foto“.</small>';return}
 const ac=document.createElement('canvas'),ag=ac.getContext('2d',{willReadFrequently:true});let okSeit=0,schaerfe=[];
 q('fAusl').onclick=()=>{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);stopp();c.toBlob(b=>fotoDa(b,seite),'image/jpeg',0.95)};
 let letzte=0;
 const tick=t=>{LOOP=requestAnimationFrame(tick);if(t-letzte<250||!v.videoWidth)return;letzte=t;
  const vw=v.videoWidth,vh=v.videoHeight,sw=160,sh=Math.round(160*vh/vw);ac.width=sw;ac.height=sh;ag.drawImage(v,0,0,sw,sh);const r=pruefe(ag.getImageData(0,0,sw,sh).data,sw,sh);
  const cw=320,ch=320;ac.width=cw;ac.height=ch;ag.drawImage(v,vw*0.3,vh*0.35,vw*0.4,vh*0.3,0,0,cw,ch);const lap=laplace(ag.getImageData(0,0,cw,ch).data,cw,ch);
  schaerfe.push(lap);if(schaerfe.length>12)schaerfe.shift();const smax=Math.max(...schaerfe);
  const hin=[];
  if(r.dunkel)hin.push(['Mehr Licht','Das Bild ist zu dunkel.']);
  else if(r.holz<0.25)hin.push(['Näher ran','Untere Backe der '+SN[seite]+' mit f-Loch und Steg ins Bild.']);
  else if(!r.rand)hin.push(['Weiter weg','Der Rand der unteren Backe muss mit ins Bild.']);
  else if(!r.fLoch)hin.push(['f-Loch ins Bild','Rand, f-Loch und Steg sollen zu sehen sein – bis über die Mitte der Decke.']);
  else if(r.holz<0.45)hin.push(['Näher ran','Die Decke soll den größten Teil des Bildes füllen.']);
  if(ORI.beta!=null&&(Math.abs(ORI.beta)>6||Math.abs(ORI.gamma)>6))hin.push(['Handy waagerecht halten','Parallel zur Decke, nicht schräg.']);
  if(r.spiegel>0.004)hin.push(['Spiegelung vermeiden','Licht von der Seite, keine Lampe von oben, kein Blitz.']);
  if(lap<smax*0.55||lap<4)hin.push(['Ruhig halten','Das Bild ist unscharf.']);
  const ans=q('fAns'),aus=q('fAusl');if(!ans)return;
  if(!hin.length){if(!okSeit)okSeit=t;const ok=t-okSeit>700;ans.className='ansage'+(ok?' ok':'');ans.innerHTML=ok?'Gut – jetzt auslösen':'Gleich gut …';aus.classList.toggle('ok',ok)}
  else{okSeit=0;ans.className='ansage';ans.innerHTML=esc(hin[0][0])+'<small>'+esc(hin[0][1])+'</small>';aus.classList.remove('ok')}};
 LOOP=requestAnimationFrame(tick);
}
// grobe Prüfung im Vorschaubild: Holzanteil, Hintergrund am Rand, f-Loch (dunkler Fleck im Holz), Spiegelung
function pruefe(d,w,h){const N=w*h,holz=new Uint8Array(N);let summe=0,nh=0,hell=0,bg=0;
 for(let i=0,p=0;p<N;i+=4,p++){const c=hsv(d[i],d[i+1],d[i+2]);summe+=c.v;if(istHolz(c)){holz[p]=1;nh++}}
 for(let p=0,i=0;p<N;p++,i+=4){if(holz[p])continue;const x=p%w,y=(p/w)|0;const r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);
  // Spiegelung: fast weiß, ungesättigt, neben Holz
  if(mx>235&&mx-mn<40&&((x>2&&holz[p-3])||(x<w-3&&holz[p+3])))hell++;
  // Hintergrund: nicht Holz und nicht dunkel
  if(mx>70&&!(x>2&&holz[p-3])&&!(x<w-3&&holz[p+3]))bg++}
 // f-Loch: dunkle Punkte, rundum von Holz umgeben (grob: in Holzzeilen)
 let fl=0;for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const p=y*w+x,i=p*4;if(Math.max(d[i],d[i+1],d[i+2])<55&&holz[p-2]+holz[p+2]+holz[p-2*w]+holz[p+2*w]>=1)fl++}
 return{dunkel:summe/N<0.18,holz:nh/N,rand:bg/N>0.04,fLoch:fl/N>0.006,spiegel:hell/Math.max(1,nh)}}
function hsv(R,G,B){const r=R/255,g=G/255,b=B/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),s=mx?(mx-mn)/mx:0;let h=0;if(mx>mn){if(mx===r)h=((g-b)/(mx-mn))%6;else if(mx===g)h=(b-r)/(mx-mn)+2;else h=(r-g)/(mx-mn)+4;h*=60;if(h<0)h+=360}return{h,s,v:mx}}
function istHolz(c){return c.s>0.18&&c.v>0.15&&c.h>=2&&c.h<=55}
function laplace(d,w,h){const g=new Float32Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=4)g[p]=d[i]*.299+d[i+1]*.587+d[i+2]*.114;let s=0,s2=0,n=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;const l=4*g[p]-g[p-1]-g[p+1]-g[p-w]-g[p+w];s+=l;s2+=l*l;n++}const m=s/n;return s2/n-m*m}

// ---------- Schritt 3: Foto auswerten – Maserung gibt die Längsachse, f-Loch die Lage, Rand oben ----------
function morph(m,w,h,grow){const o=new Uint8Array(m.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;let v=m[p];
 if(grow){if(!v)v=(x>0&&m[p-1])||(x<w-1&&m[p+1])||(y>0&&m[p-w])||(y<h-1&&m[p+w])?1:0}else{if(v)v=(x>0&&!m[p-1])||(x<w-1&&!m[p+1])||(y>0&&!m[p-w])||(y<h-1&&!m[p+w])?0:1}o[p]=v}return o}
function groessteFlaeche(m,w,h){const N=w*h,lab=new Int32Array(N),st=new Int32Array(N);let best=0,bn=0,nl=0;
 for(let p=0;p<N;p++){if(!m[p]||lab[p])continue;nl++;let sp=0,n=0;st[sp++]=p;lab[p]=nl;while(sp){const q2=st[--sp];n++;const x=q2%w,y=(q2-x)/w;
  for(const r of[x>0?q2-1:-1,x<w-1?q2+1:-1,y>0?q2-w:-1,y<h-1?q2+w:-1])if(r>=0&&m[r]&&!lab[r]){lab[r]=nl;st[sp++]=r}}if(n>bn){bn=n;best=nl}}
 const o=new Uint8Array(N);for(let p=0;p<N;p++)if(lab[p]===best)o[p]=1;return{m:o,n:bn}}
function fuellen(m,w,h){const N=w*h,aus=new Uint8Array(N),st=new Int32Array(N);let sp=0;const push=r=>{if(!m[r]&&!aus[r]){aus[r]=1;st[sp++]=r}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(sp){const r=st[--sp];const x=r%w,y=(r-x)/w;if(x>0)push(r-1);if(x<w-1)push(r+1);if(y>0)push(r-w);if(y<h-1)push(r+w)}
 const o=new Uint8Array(N);for(let p=0;p<N;p++)o[p]=aus[p]?0:1;return o}
// f-Loch: dunkle Fläche, die den Bildrand nicht berührt und länglich ist; die größte davon
function fLoch(m,w,h){const N=w*h,lab=new Int32Array(N),st=new Int32Array(N);let nl=0;const kand=[];
 for(let p=0;p<N;p++){if(!m[p]||lab[p])continue;nl++;let sp=0,n=0,rand=false,sx=0,sy=0,sxx=0,syy=0,sxy=0;st[sp++]=p;lab[p]=nl;
  while(sp){const r=st[--sp];n++;const x=r%w,y=(r-x)/w;sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;if(x===0||y===0||x===w-1||y===h-1)rand=true;
   for(const z of[x>0?r-1:-1,x<w-1?r+1:-1,y>0?r-w:-1,y<h-1?r+w:-1])if(z>=0&&m[z]&&!lab[z]){lab[z]=nl;st[sp++]=z}}
  if(rand||n<20)continue;const mx=sx/n,my=sy/n,cxx=sxx/n-mx*mx,cyy=syy/n-my*my,cxy=sxy/n-mx*my;const tr=cxx+cyy,de=Math.sqrt(Math.max(0,(cxx-cyy)**2/4+cxy*cxy));
  const el=Math.sqrt((tr/2+de)/Math.max(1e-6,tr/2-de));const sc=n*Math.min(el,6);if(el>1.8)kand.push({n,sc,F:[mx,my]})}
 kand.sort((a,b)=>b.sc-a.sc);return kand.slice(0,2).filter(k=>k.n>=kand[0].n*0.3)}
function auswerten(bild){
 const f=600/Math.max(bild.width,bild.height),w=Math.round(bild.width*f),h=Math.round(bild.height*f);
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bild,0,0,w,h);const d=g.getImageData(0,0,w,h).data;c.width=c.height=0;
 const N=w*h;let holz=new Uint8Array(N),V=new Float32Array(N),L=new Float32Array(N);
 for(let p=0,i=0;p<N;p++,i+=4){const cc=hsv(d[i],d[i+1],d[i+2]);V[p]=cc.v;L[p]=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255;if(istHolz(cc))holz[p]=1}
 holz=morph(morph(holz,w,h,false),w,h,true);{let z=holz;for(let i=0;i<4;i++)z=morph(z,w,h,true);for(let i=0;i<4;i++)z=morph(z,w,h,false);holz=z}const gf=groessteFlaeche(holz,w,h);if(gf.n<N*0.15)return null;holz=gf.m;const geige=fuellen(holz,w,h);
 // Maserung: Strukturtensor im Inneren des Holzes
 const innen=morph(morph(morph(holz,w,h,false),w,h,false),w,h,false);let jxx=0,jyy=0,jxy=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(!innen[p])continue;
  const gx=(L[p-w+1]+2*L[p+1]+L[p+w+1])-(L[p-w-1]+2*L[p-1]+L[p+w-1]),gy=(L[p+w-1]+2*L[p+w]+L[p+w+1])-(L[p-w-1]+2*L[p-w]+L[p-w+1]);jxx+=gx*gx;jyy+=gy*gy;jxy+=gx*gy}
 const phi=0.5*Math.atan2(2*jxy,jxx-jyy);let ax=[-Math.sin(phi),Math.cos(phi)];if(ax[1]<0)ax=[-ax[0],-ax[1]];const qu=[ax[1],-ax[0]];
 // f-Loch = größte dunkle Fläche in der Geige
 let dk=new Uint8Array(N);for(let p=0;p<N;p++)if(geige[p]&&V[p]<0.14)dk[p]=1;const fls=fLoch(dk,w,h).filter(k=>k.n>=N*0.0015);if(!fls.length)return{fehler:'Kein f-Loch gefunden'};
 const out=[];for(const fl of fls){const r=geo(fl.F);if(r&&!r.fehler)out.push(r)}if(!out.length)return{fehler:'Rand nicht gefunden'};
 // ganze Decke: Abstand der beiden f-Löcher ≈ 0,79 × halbe untere Breite (vorläufiger Maßstab, unabhängig vom Hintergrund)
 if(out.length===2&&out[0].layout!==out[1].layout){const sp=Math.hypot(out[0].F[0]-out[1].F[0],out[0].F[1]-out[1].F[1]);const M=[(out[0].F[0]+out[1].F[0])/2,(out[0].F[1]+out[1].F[1])/2];for(const r of out){r.hw=sp/0.79;const e=r.hw*1.04;r.rim=[M[0]-r.Y[0]*e,M[1]-r.Y[1]*e]}}
 return{liste:out};
 function geo(F){
 // Rand: von der f-Loch-Linie quer nach außen, bis das Holz endet (kurze Unterbrechungen wie Saiten zählen nicht)
 const weite=(px,py,dx,dy)=>{for(let k=1;k<2000;k++){const x=Math.round(px+dx*k),y=Math.round(py+dy*k);if(x<0||y<0||x>=w||y>=h)return null;
   if(!geige[y*w+x]){let n=0,gg=0,ok=true;for(let j=1;;j++){const xx=Math.round(px+dx*(k+j)),yy=Math.round(py+dy*(k+j));if(xx<0||yy<0||xx>=w||yy>=h)break;n++;if(geige[yy*w+xx]){gg++;if(j<15)ok=false}}if(ok&&gg<=0.1*n)return k}}return null};   // Rand nur, wenn danach (fast) kein Holz mehr kommt – nicht am Griffbrett
 const res={1:[],'-1':[]};for(const sg of[1,-1])for(let t=-Math.round(0.45*Math.max(w,h));t<=Math.round(0.45*Math.max(w,h));t+=3){const px=F[0]+ax[0]*t,py=F[1]+ax[1]*t;if(px<0||py<0||px>=w||py>=h)continue;const k=weite(px,py,qu[0]*sg,qu[1]*sg);if(k!=null)res[sg].push([t,k])}
 const med=a=>{if(a.length<10)return 1e9;const s=a.map(z=>z[1]).sort((x,y)=>x-y);return s[s.length>>1]};
 const rs=med(res[1])<=med(res['-1'])?1:-1;const R=res[rs];if(R.length<10)return{fehler:'Rand nicht gefunden'};
 let tw=0,kw=0;for(const[t,k]of R)if(k>kw){kw=k;tw=t}
 // C-Bügel = tiefste Einbuchtung des Randes (auf beiden Seiten weiter außen); die Schnecke liegt von der breitesten Stelle aus in Richtung C-Bügel
 const Rs=R.slice().sort((x,y)=>x[0]-y[0]),K=Rs.map((z,i)=>{let a=0,n=0;for(let j=Math.max(0,i-3);j<=Math.min(Rs.length-1,i+3);j++){a+=Rs[j][1];n++}return a/n});
 const lm=[],rm=[];let m1=-1e9;for(let i=0;i<K.length;i++){m1=Math.max(m1,K[i]);lm.push(m1)}let m2=-1e9;for(let i=K.length-1;i>=0;i--){m2=Math.max(m2,K[i]);rm[i]=m2}
 let ic=-1,tief=0;for(let i=0;i<K.length;i++){const dd=Math.min(lm[i],rm[i])-K[i];if(dd>tief){tief=dd;ic=i}}
 let schnecke;if(ic>=0&&tief>0.1*kw)schnecke=Rs[ic][0]>tw?1:-1;
 else{let o=0,no=0,u=0,nu=0;for(const[t,k]of R){if(t>0){o+=k;no++}else{u+=k;nu++}}schnecke=(no?o/no:1e9)<(nu?u/nu:1e9)?1:-1}
 // Zielachsen: Y nach unten = vom Rand weg; X senkrecht dazu (reine Drehung, nie gespiegelt)
 const Y=[-qu[0]*rs,-qu[1]*rs],X=[Y[1],-Y[0]];
 const sv=[ax[0]*schnecke,ax[1]*schnecke];const layout=(X[0]*sv[0]+X[1]*sv[1])>0?'B':'T';   // Schnecke rechts = Bassbild
 const rim=[(F[0]+ax[0]*tw+qu[0]*rs*kw)/f,(F[1]+ax[1]*tw+qu[1]*rs*kw)/f],Ff=[F[0]/f,F[1]/f];
 return{X,Y,rim,F:Ff,kw:kw/f,layout}}}

const FOTOS2_LBL={B:'Bass',T:'Diskant'};
async function fotoDa(blob,seite){
 W0.innerHTML='<div class="ansage ok" id="fAns">Foto wird ausgewertet …</div>';
 let bild;try{bild=await createImageBitmap(blob)}catch(e){alert('Foto lässt sich nicht lesen');kamera(seite);return}
 let r=null;try{r=auswerten(bild)}catch(e){r={fehler:String(e&&e.message||e)}}
 if(!r||r.fehler){alert((r&&r.fehler?r.fehler+'. ':'Ich finde die Decke auf dem Foto nicht sicher. ')+'Bitte noch einmal: Rand der unteren Backe, f-Loch und Steg, Decke füllt das Bild.');kamera(seite);return}
 const L=r.liste;let mein=L.find(z=>z.layout===seite);
 if(!mein){if(!confirm('Das Foto sieht nach der '+SN[L[0].layout]+' aus, nicht nach der '+SN[seite]+'. Trotzdem als '+SN[seite]+' nehmen?')){kamera(seite);return}mein=L[0]}
 FOTOS2[seite]={foto:blob,...await seitenBild(bild,mein,seite)};
 // ganze Decke auf einem Foto: die andere Seite gleich mit
 const ander=seite==='B'?'T':'B',zweit=L.find(z=>z!==mein&&z.layout===ander);
 if(zweit&&!FOTOS2[ander]){FOTOS2[ander]={foto:blob,...await seitenBild(bild,zweit,ander)}}
 try{bild.close&&bild.close()}catch(e){}
 if(!FOTOS2.T){kamera('T');return}
 if(!FOTOS2.B){kamera('B');return}
 await fertigBauen();
}
async function seitenBild(bild,r,seite){
 // vorläufiger Maßstab: Rand bis f-Loch ≈ halbe halbe Breite. Der echte Maßstab kommt nach dem Messen aus der halben unteren Breite.
 const hw=r.hw||r.kw/0.5,mmpx=(+A.breite/2)/hw;
 const Wp=Math.round(180/mmpx);const xsteg=r.layout==='B'?76.2/mmpx:Wp-76.2/mmpx;
 // Höhe: so weit das Foto reicht, höchstens 1,3 × halbe Breite
 let Hp=Math.round(1.3*hw);for(let y=10;y<Hp;y+=10){const sx=r.rim[0]+r.Y[0]*y,sy=r.rim[1]+r.Y[1]*y;if(sx<0||sy<0||sx>=bild.width||sy>=bild.height){Hp=y;break}}
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];const X=r.X,Y=r.Y;
 const ox=dot(r.F,X)-xsteg,oy=dot(r.rim,Y);
 const c=document.createElement('canvas');c.width=Wp;c.height=Hp;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,Wp,Hp);g.imageSmoothingQuality='high';
 g.setTransform(X[0],Y[0],X[1],Y[1],-ox,-oy);g.drawImage(bild,0,0);g.setTransform(1,0,0,1,0,0);
 const b=await new Promise(res=>c.toBlob(res,'image/jpeg',0.93));c.width=c.height=0;
 return{bild:b,dpi:Math.max(50,Math.round(25.4/mmpx))}}
async function fertigBauen(){
 W0.innerHTML='<div class="ansage ok" id="fAns">Bilder werden vorbereitet …</div>';
 const nr=nummer();const kurz=A.kurz.replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g,'').slice(0,24)||'Instrument';const files=[];
 for(const s of['B','T']){const z=FOTOS2[s];if(!z)continue;const u8=setzeDpi(new Uint8Array(await z.bild.arrayBuffer()),z.dpi);files.push(new File([u8],nr+s+'_'+kurz+'.jpg',{type:'image/jpeg'}))}
 const richt={B:A.richtung.B,T:A.richtung.T},fotos={B:FOTOS2.B&&FOTOS2.B.foto,T:FOTOS2.T&&FOTOS2.T.foto};
 zu();await oeffneBilder(files);
 if(META){META.richtung=richt;META.breite=+A.breite;META.quelle='Handy-Foto';META.halbfoto=true;for(const s of['B','T'])if(fotos[s])MEM.set('foto_'+s+'.jpg',fotos[s]);await merkeKacheln();
  info(KEY+' – oben am Rand anfangen und bis zur Mitte (Fuge) messen');zeigeAnleitung()}
}
// Vor dem Messen: Symbolbild, wo die Pfeilspitze hin muss
function zeigeAnleitung(){W0.style.display='block';W0.innerHTML=`<div class="seite" style="display:flex;flex-direction:column;justify-content:center;gap:18px"><img src="pfeil_tafel.jpg" alt="" style="width:100%;border-radius:8px"><div class="knopfzeile"><button id="fLos" class="haupt">Messen</button></div></div>`;q('fLos').onclick=()=>{W0.style.display='none';W0.innerHTML=''}}
function nummer(){const d=new Date(),p=n=>String(n).padStart(2,'0');return String(d.getFullYear()).slice(2)+p(d.getMonth()+1)+p(d.getDate())+p(d.getHours())}
function setzeDpi(u8,dpi){if(u8[0]!==0xFF||u8[1]!==0xD8)return u8;if(u8[2]===0xFF&&u8[3]===0xE0&&u8[6]===0x4A&&u8[7]===0x46){u8[13]=1;u8[14]=dpi>>8;u8[15]=dpi&255;u8[16]=dpi>>8;u8[17]=dpi&255;return u8}
 const app0=[0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0];const o=new Uint8Array(u8.length+app0.length);o.set(u8.subarray(0,2),0);o.set(app0,2);o.set(u8.subarray(2),2+app0.length);return o}
// Fertig: die Instrumentenfotos automatisch mitsenden
function fotoListe(){const l=[];if(META)for(const s of['B','T'])if(MEM.has('foto_'+s+'.jpg'))l.push(new File([MEM.get('foto_'+s+'.jpg')],KEY+'_Foto_'+s+'.jpg',{type:'image/jpeg'}));return l}
const fb=q('bFertig');if(fb){const alt=fb.onclick;fb.onclick=function(){alt&&alt.apply(this,arguments);try{const l=fotoListe();if(l.length){FOTOS=l;const el=q('fAnz');if(el)el.textContent=l.length+' Instrumentenfoto(s) dabei'}}catch(e){}}}
const fo=q('fotos');if(fo){const alt=fo.onchange;fo.onchange=function(e){alt&&alt.call(this,e);try{const l=fotoListe();if(l.length){FOTOS=l.concat(FOTOS);const el=q('fAnz');if(el)el.textContent=FOTOS.length+' Foto(s) dabei'}}catch(_){}}}
})();
