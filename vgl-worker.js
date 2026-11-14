// Vergleich im Hintergrund (lokal). Referenzen werden einmal uebergeben und vorbereitet.
importScripts('dendro.js');
let REFS=[];
onmessage=e=>{const m=e.data;
 if(m.typ==='refs'){REFS=m.refs;REFS.forEach(r=>{r._v=null});postMessage({typ:'refs-ok',n:REFS.length});return}
 if(m.typ==='vgl'){const out={};const t0=Date.now();
  let bt=null;if(m.B&&m.T&&m.B.length>=30&&m.T.length>=30){bt=Dendro.btMittel(m.B,m.T,30)}
  const kurven=[];if(m.B&&m.B.length>=20)kurven.push(['B',m.B]);if(m.T&&m.T.length>=20)kurven.push(['T',m.T]);if(bt&&bt.tbp>=4)kurven.push(['M',bt.mittel]);
  for(const[k,v]of kurven){postMessage({typ:'stand',text:'vergleiche '+({B:'Bass',T:'Diskant',M:'Mittelkurve'}[k])+' …'});out[k]=Dendro.schnellvergleich({name:k,vals:v},REFS,{minUeb:m.minUeb||40})}
  postMessage({typ:'vgl-ok',out,bt:bt?{mittel:bt.mittel,lage:bt.lage,tbp:bt.tbp,tho:bt.tho,glk:bt.glk,ueb:bt.ueb,cdi:Dendro.cdiWert(bt.glk,bt.tbp,bt.tho,bt.ueb,Math.min(m.B.length,m.T.length))}:null,ms:Date.now()-t0})}};
