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
#fotoW .ansage small{display:block;font-size:14px;font-weight:400;margin-top:4px;opacity:.85}
#fotoW .unten{position:absolute;left:0;right:0;bottom:0;padding:10px 12px calc(env(safe-area-inset-bottom,0px) + 12px);display:flex;gap:10px;align-items:center;justify-content:center;background:linear-gradient(transparent,rgba(0,0,0,.6))}
#fotoW .ausl{width:76px;height:76px;border-radius:50%;border:5px solid #fff;background:rgba(255,255,255,.25);font-size:0}
#fotoW .ausl.ok{background:#2fd35a}
#fotoW .klein{min-height:44px;background:rgba(255,255,255,.9)}
#fotoW .punkt{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border:3px solid #ff3b30;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px #fff}
#fotoW .punkt::after{content:'';position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;background:#ff3b30;border-radius:50%}
#fotoW .lupe{position:absolute;width:150px;height:150px;border-radius:50%;border:3px solid #fff;overflow:hidden;pointer-events:none;display:none;box-shadow:0 2px 12px rgba(0,0,0,.6)}
#fotoW .lupe canvas{width:100%;height:100%}
`;document.head.appendChild(css);
const W0=document.createElement('div');W0.id='fotoW';document.body.appendChild(W0);
const fin=document.createElement('input');fin.type='file';fin.accept='image/*';fin.setAttribute('capture','environment');fin.style.display='none';document.body.appendChild(fin);
const fin2=document.createElement('input');fin2.type='file';fin2.accept='image/*';fin2.style.display='none';document.body.appendChild(fin2);

let A={kurz:'',breite:'',richtung:{B:null,T:null}},STREAM=null,LOOP=null,ORI={beta:null,gamma:null},FOTO=null,PKT=[];
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
  kamera()};
}

// ---------- Schritt 2: Kamera mit Live-Anleitung ----------
async function kamera(){
 W0.innerHTML=`<video playsinline muted autoplay></video><div class="rahmen" id="fRahmen"></div>
 <div class="ansage" id="fAns">Kamera wird gestartet …</div>
 <div class="unten"><button class="klein" id="fZur">Zurück</button><button class="ausl" id="fAusl" aria-label="Auslösen">Foto</button><button class="klein" id="fApp">Kamera-App</button></div>`;
 q('fZur').onclick=()=>{stopp();schritt1()};
 q('fApp').onclick=()=>{stopp();fin.click()};
 // Lagesensor (iOS fragt einmal nach Erlaubnis)
 try{if(typeof DeviceOrientationEvent!=='undefined'&&DeviceOrientationEvent.requestPermission)await DeviceOrientationEvent.requestPermission()}catch(e){}
 addEventListener('deviceorientation',e=>{ORI={beta:e.beta,gamma:e.gamma}});
 const v=W0.querySelector('video');
 try{STREAM=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:3840},height:{ideal:2160}}});v.srcObject=STREAM;await v.play()}
 catch(e){q('fAns').innerHTML='Kamera nicht verfügbar<small>Tippe auf „Kamera-App“, um mit der normalen Kamera zu fotografieren.</small>';return}
 const ac=document.createElement('canvas'),ag=ac.getContext('2d',{willReadFrequently:true});let okSeit=0,schaerfe=[];
 q('fAusl').onclick=()=>{const hoch=Math.max(v.videoWidth,v.videoHeight);if(hoch<3000&&!confirm('Die Kamera liefert hier nur '+v.videoWidth+'×'+v.videoHeight+' Bildpunkte – für feine Ringe zu wenig. Trotzdem nehmen? (Besser: „Kamera-App“)'))return;
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);stopp();c.toBlob(b=>fotoDa(b),'image/jpeg',0.95)};
 let letzte=0;
 const tick=t=>{LOOP=requestAnimationFrame(tick);if(t-letzte<250||!v.videoWidth)return;letzte=t;
  const vw=v.videoWidth,vh=v.videoHeight,sw=160,sh=Math.round(160*vh/vw);ac.width=sw;ac.height=sh;ag.drawImage(v,0,0,sw,sh);const d=ag.getImageData(0,0,sw,sh).data;
  const r=pruefe(d,sw,sh);
  // Schärfe: Laplace in der Bildmitte, höher aufgelöst
  const cw=320,ch=320;ac.width=cw;ac.height=ch;ag.drawImage(v,vw*0.35,vh*0.4,vw*0.3,vh*0.2,0,0,cw,ch);const lap=laplace(ag.getImageData(0,0,cw,ch).data,cw,ch);
  schaerfe.push(lap);if(schaerfe.length>12)schaerfe.shift();const smax=Math.max(...schaerfe);
  const hin=[];
  if(r.dunkel)hin.push(['Mehr Licht','Das Bild ist zu dunkel.']);
  else if(!r.gefunden)hin.push(['Geige ins Bild','Auf hellen, einfarbigen Untergrund legen, Decke nach oben.']);
  else{
   if(r.quer)hin.push(['90° drehen','Schnecke nach oben, Saitenhalter nach unten.']);
   else if(r.hoehe<0.78)hin.push(['Näher ran','Der Korpus soll das Bild von oben bis unten fast füllen.']);
   else if(r.randBeruehrt||r.hoehe>0.97)hin.push(['Weiter weg','Der ganze Korpus muss ins Bild.']);
   else if(Math.abs(r.mx)>0.07)hin.push([r.mx>0?'Handy nach rechts':'Handy nach links','Die Geige in die Mitte nehmen.']);
   else if(Math.abs(r.my)>0.07)hin.push([r.my>0?'Handy nach unten':'Handy nach oben','Die Geige in die Mitte nehmen.']);
  }
  if(ORI.beta!=null&&(Math.abs(ORI.beta)>6||Math.abs(ORI.gamma)>6))hin.push(['Handy waagerecht halten','Parallel zur Decke, nicht schräg.']);
  if(r.gefunden&&r.spiegel>0.004)hin.push(['Spiegelung vermeiden','Licht von der Seite, keine Lampe von oben, kein Blitz.']);
  if(lap<smax*0.55||lap<4)hin.push(['Ruhig halten','Das Bild ist unscharf.']);
  const ans=q('fAns'),rah=q('fRahmen'),aus=q('fAusl');if(!ans)return;
  if(!hin.length){if(!okSeit)okSeit=t;const ok=t-okSeit>700;ans.className='ansage'+(ok?' ok':'');ans.innerHTML=ok?'Gut – jetzt auslösen':'Gleich gut …';rah.classList.toggle('ok',ok);aus.classList.toggle('ok',ok)}
  else{okSeit=0;ans.className='ansage';ans.innerHTML=esc(hin[0][0])+'<small>'+esc(hin[0][1])+'</small>';rah.classList.remove('ok');aus.classList.remove('ok')}};
 LOOP=requestAnimationFrame(tick);
}
// Lack/Holz: orange-braune Bildpunkte; Spiegelung: fast weiß und ungesättigt innerhalb der Geige
function pruefe(d,w,h){let summe=0;const holz=new Uint8Array(w*h);let hell=0;
 for(let i=0,p=0;p<w*h;i+=4,p++){const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),v=mx,s=mx?(mx-mn)/mx:0;summe+=v;
  let hu=0;if(mx>mn){if(mx===r)hu=((g-b)/(mx-mn))%6;else if(mx===g)hu=(b-r)/(mx-mn)+2;else hu=(r-g)/(mx-mn)+4;hu*=60;if(hu<0)hu+=360}
  if(s>0.28&&v>0.12&&hu>=4&&hu<=50)holz[p]=1}
 const dunkel=summe/(w*h)<0.18;
 const zs=new Int32Array(h),ss=new Int32Array(w);let n=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(holz[y*w+x]){zs[y]++;ss[x]++;n++}
 if(n<w*h*0.08)return{gefunden:false,dunkel};
 const zr=zs.reduce((a,b)=>Math.max(a,b),0),sr=ss.reduce((a,b)=>Math.max(a,b),0);
 let y0=0,y1=h-1,x0=0,x1=w-1;while(y0<h&&zs[y0]<zr*0.15)y0++;while(y1>0&&zs[y1]<zr*0.15)y1--;while(x0<w&&ss[x0]<sr*0.15)x0++;while(x1>0&&ss[x1]<sr*0.15)x1--;
 const bh=(y1-y0+1)/h,bw=(x1-x0+1)/w;const quer=(x1-x0)>(y1-y0);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);if(mx>235&&(mx-mn)<40){const nb=holz[y*w+Math.max(0,x-3)]||holz[y*w+Math.min(w-1,x+3)];if(nb)hell++}}
 const flaeche=(y1-y0+1)*(x1-x0+1);
 return{gefunden:true,dunkel,hoehe:bh,breite:bw,quer,mx:((x0+x1)/2/w-0.5),my:((y0+y1)/2/h-0.5),randBeruehrt:y0<=1||y1>=h-2,spiegel:hell/flaeche}}
function laplace(d,w,h){const g=new Float32Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=4)g[p]=d[i]*.299+d[i+1]*.587+d[i+2]*.114;let s=0,s2=0,n=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;const l=4*g[p]-g[p-1]-g[p+1]-g[p-w]-g[p+w];s+=l;s2+=l*l;n++}const m=s/n;return s2/n-m*m}

fin.onchange=()=>{const f=fin.files&&fin.files[0];fin.value='';if(f)fotoDa(f);else kamera()};
fin2.onchange=()=>{const f=fin2.files&&fin2.files[0];fin2.value='';if(f)fotoDa(f)};

// ---------- Schritt 3: drei Punkte tippen ----------
const ANW=['Tippe auf den Rand der unteren Backe – Bassseite, an der breitesten Stelle','Jetzt auf den Rand der unteren Backe – Diskantseite, an der breitesten Stelle','Jetzt auf die Mitte des Stegs (zwischen D- und A-Saite)'];
async function fotoDa(blob){FOTO={blob,bild:await createImageBitmap(blob)};PKT=[];punkte()}
function punkte(){
 W0.innerHTML=`<canvas class="voll" id="fBild"></canvas><div class="lupe" id="fLupe"><canvas width="300" height="300"></canvas></div>
 <div class="ansage" id="fAns"></div>
 <div class="unten fest"><button class="klein" id="fNeu">Neues Foto</button><button class="klein" id="fRuck">Punkt zurück</button><button class="klein haupt" id="fFertig" disabled>Weiter</button></div>`;
 const c=q('fBild'),g=c.getContext('2d');const dpr=devicePixelRatio||1;const R=c.getBoundingClientRect();c.width=R.width*dpr;c.height=R.height*dpr;
 const im=FOTO.bild,sc=Math.min(c.width/im.width,c.height/im.height),ox=(c.width-im.width*sc)/2,oy=(c.height-im.height*sc)/2;
 const zeichne=()=>{g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.drawImage(im,ox,oy,im.width*sc,im.height*sc);
  W0.querySelectorAll('.punkt').forEach(e=>e.remove());PKT.forEach(p=>{const e=document.createElement('div');e.className='punkt';e.style.left=((ox+p[0]*sc)/dpr)+'px';e.style.top=((oy+p[1]*sc)/dpr)+'px';W0.appendChild(e)});
  if(PKT.length>=2){g.strokeStyle='#ff3b30';g.lineWidth=2*dpr;g.setLineDash([8*dpr,6*dpr]);g.beginPath();g.moveTo(ox+PKT[0][0]*sc,oy+PKT[0][1]*sc);g.lineTo(ox+PKT[1][0]*sc,oy+PKT[1][1]*sc);g.stroke();g.setLineDash([])}
  q('fAns').innerHTML=PKT.length<3?esc(ANW[PKT.length])+'<small>Finger auflegen, mit der Lupe genau zielen, dann loslassen.</small>':'Fertig – „Weiter“ tippen';q('fFertig').disabled=PKT.length<3};
 const lupe=q('fLupe'),lg=lupe.querySelector('canvas').getContext('2d');
 const bildPkt=e=>{const t=e.touches?e.touches[0]||e.changedTouches[0]:e;const r=c.getBoundingClientRect();return[((t.clientX-r.left)*dpr-ox)/sc,((t.clientY-r.top)*dpr-oy)/sc,t.clientX,t.clientY]};
 const zeigeLupe=p=>{lupe.style.display='block';lupe.style.left=(p[2]-75)+'px';lupe.style.top=Math.max(4,p[3]-200)+'px';const sw=150*dpr/(3*sc);lg.fillStyle='#000';lg.fillRect(0,0,300,300);lg.drawImage(im,p[0]-sw/2,p[1]-sw/2,sw,sw,0,0,300,300);lg.strokeStyle='#ff3b30';lg.lineWidth=2;lg.beginPath();lg.moveTo(150,130);lg.lineTo(150,170);lg.moveTo(130,150);lg.lineTo(170,150);lg.stroke()};
 let aktiv=false;
 c.addEventListener('pointerdown',e=>{if(PKT.length>=3)return;aktiv=true;e.preventDefault();zeigeLupe(bildPkt(e))});
 c.addEventListener('pointermove',e=>{if(aktiv)zeigeLupe(bildPkt(e))});
 c.addEventListener('pointerup',e=>{if(!aktiv)return;aktiv=false;lupe.style.display='none';const p=bildPkt(e);if(p[0]<0||p[1]<0||p[0]>im.width||p[1]>im.height)return;PKT.push([p[0],p[1]]);zeichne()});
 c.addEventListener('pointercancel',()=>{aktiv=false;lupe.style.display='none'});
 q('fNeu').onclick=()=>kamera();q('fRuck').onclick=()=>{PKT.pop();zeichne()};
 q('fFertig').onclick=()=>bauen();
 zeichne();
}

// ---------- Schritt 4: B- und T-Bild bauen (Aufbau wie die Dendro-Bilder: 18 cm breit, Steg bei 3600/8504) ----------
async function bauen(){
 q('fAns').innerHTML='Bilder werden vorbereitet …';
 const [P1,P2,S]=PKT,br=+A.breite;const dx=P2[0]-P1[0],dy=P2[1]-P1[1],L=Math.hypot(dx,dy);if(L<50){alert('Die beiden Randpunkte liegen zu nah beieinander');PKT=[];punkte();return}
 const s=br/L;               // mm pro Fotopunkt
 const u=[dx/L,dy/L],v=[u[1],-u[0]];  // u: Bass→Diskant, v: Richtung Schnecke
 const C=[(P1[0]+P2[0])/2,(P1[1]+P2[1])/2];
 // Schnecke muss "oben" liegen: der Steg liegt Richtung Schnecke von der unteren Backe aus
 let vv=v;if(((S[0]-C[0])*v[0]+(S[1]-C[1])*v[1])<0){vv=[-v[0],-v[1]]}
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];const tb=dot([S[0]-C[0],S[1]-C[1]],vv);
 // Bass liegt auf der Seite von P1
 const ub=[-(P1[0]-C[0])/(L/2),-(P1[1]-C[1])/(L/2)]; // Richtung von Bass zur Mitte = +ub ist Richtung Diskant
 const Wp=Math.round(180/s),Hp=Math.round((br/2+5)/s),steg=76.2/s,Dm=L/2;
 const dpi=Math.round(25.4/s);
 const mache=(seite)=>{const c=document.createElement('canvas');c.width=Wp;c.height=Hp;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,Wp,Hp);g.imageSmoothingQuality='high';
  if(seite==='B'){ // X = (q-C)·vv - tb + steg ; Y = Dm + (q-C)·ub
   g.setTransform(vv[0],ub[0],vv[1],ub[1],-dot(C,vv)-tb+steg,-dot(C,ub)+Dm)}
  else{ // X = Wp - ((q-C)·vv - tb) - steg ; Y = Dm - (q-C)·ub
   g.setTransform(-vv[0],-ub[0],-vv[1],-ub[1],Wp+dot(C,vv)+tb-steg,dot(C,ub)+Dm)}
  g.drawImage(FOTO.bild,0,0);g.setTransform(1,0,0,1,0,0);return c};
 const nr=nummer();const kurz=A.kurz.replace(/[^A-Za-z0-9ÄÖÜäöüß]+/g,'').slice(0,24)||'Instrument';
 const files=[];
 for(const sei of['B','T']){const c=mache(sei);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.93));c.width=c.height=0;const u8=setzeDpi(new Uint8Array(await b.arrayBuffer()),dpi);files.push(new File([u8],nr+sei+'_'+kurz+'.jpg',{type:'image/jpeg'}))}
 const blob=FOTO.blob,richt={B:A.richtung.B,T:A.richtung.T};
 zu();
 await oeffneBilder(files);
 if(META){META.richtung=richt;META.breite=br;META.quelle='Handy-Foto';MEM.set('foto.jpg',blob);await merkeKacheln();
  info(KEY+' – oben am Rand anfangen'+(dpi<200?' · Achtung: nur '+dpi+' dpi, Ringe evtl. zu fein':''))}
}
function nummer(){const d=new Date(),p=n=>String(n).padStart(2,'0');return String(d.getFullYear()).slice(2)+p(d.getMonth()+1)+p(d.getDate())+p(d.getHours())}
function setzeDpi(u8,dpi){if(u8[0]!==0xFF||u8[1]!==0xD8)return u8;if(u8[2]===0xFF&&u8[3]===0xE0&&u8[6]===0x4A&&u8[7]===0x46){u8[13]=1;u8[14]=dpi>>8;u8[15]=dpi&255;u8[16]=dpi>>8;u8[17]=dpi&255;return u8}
 const app0=[0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0];const o=new Uint8Array(u8.length+app0.length);o.set(u8.subarray(0,2),0);o.set(app0,2);o.set(u8.subarray(2),2+app0.length);return o}

// Fertig: Instrumentenfoto automatisch mitsenden
const fb=q('bFertig');if(fb){const alt=fb.onclick;fb.onclick=function(){alt&&alt.apply(this,arguments);try{if(META&&MEM.has('foto.jpg')){FOTOS=[new File([MEM.get('foto.jpg')],KEY+'_Foto.jpg',{type:'image/jpeg'})];const el=q('fAnz');if(el)el.textContent='Instrumentenfoto dabei'}}catch(e){}}}
const fo=q('fotos');if(fo){const alt=fo.onchange;fo.onchange=function(e){alt&&alt.call(this,e);try{if(META&&MEM.has('foto.jpg')){FOTOS=[new File([MEM.get('foto.jpg')],KEY+'_Foto.jpg',{type:'image/jpeg'})].concat(FOTOS);const el=q('fAnz');if(el)el.textContent=FOTOS.length+' Foto(s) dabei'}}catch(_){}}}
})();
