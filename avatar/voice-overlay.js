'use strict';
(()=>{
const canvas=document.getElementById('heaven'),g=canvas.getContext('2d',{alpha:true}),q=new URLSearchParams(location.search),linked=new URLSearchParams(location.hash.slice(1)).has('p'),preview=q.get('preview'),demo=Boolean(preview)||!linked;
let state='off',speaker=null,lastEngine=0,lastOutput=-10000,lastInput=-10000,outLevel=0,inLevel=0,energy=0,opacity=0,previous=performance.now();
const active=s=>['connecting','question','thinking','listening','speaking'].includes(s);
function rms(data){try{const raw=atob(data);if(raw.length%2)return 0;const v=new DataView(Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer);let sum=0;for(let i=0;i<v.byteLength;i+=2)sum+=(v.getInt16(i,true)/32768)**2;return Math.min(1,Math.sqrt(sum/(v.byteLength/2))*5);}catch{return 0;}}
if(!demo)new BatVoice.Bus(d=>{
 const now=performance.now();
 if(d.kind==='engine-status'){
  if(speaker&&speaker!==d.sender&&active(state)&&now-lastEngine<7000)return;
  speaker=d.sender;state=d.state;lastEngine=now;
 }
 if(d.sender!==speaker&&speaker)return;
 if(d.kind==='input-level'){inLevel=Math.max(0,Math.min(1,d.level||0));lastInput=now;}
 if(d.kind==='audio'){outLevel=rms(d.pcm||'');lastOutput=now;}
 if(d.kind==='audio-reset'){lastOutput=-10000;outLevel=0;}
});
function ellipse(x,y,rx,ry,color){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=color;g.fill();}
function roundRect(x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
function frame(now){
 const dt=Math.min(.08,(now-previous)/1000);previous=now;const t=now/1000;
 let phase=state,target=0;
 if(demo){phase=preview||['question','thinking','speaking','listening'][Math.floor(t/5)%4];target=phase==='speaking'?(.25+.6*Math.max(0,Math.sin(t*4.3))):phase==='question'?(.12+.5*Math.max(0,Math.sin(t*5.1))):0;}
 else{
  if(now-lastEngine>7000)phase='off';
  if(now-lastOutput<300&&active(phase)){phase='speaking';target=outLevel*Math.max(0,1-(now-lastOutput)/400);}
  else if(phase==='question'&&now-lastInput<350)target=inLevel;
 }
 opacity+=(active(phase)?1-opacity:-opacity)*Math.min(1,dt*10);
 energy+=(target-energy)*Math.min(1,dt*16);
 g.clearRect(0,0,512,512);if(opacity<.005){requestAnimationFrame(frame);return;}
 g.save();g.globalAlpha=opacity;
 const speaking=phase==='speaking',thinking=phase==='thinking',question=phase==='question',accent=question?'#b5dbeb':'#f5ce79',pulse=.5+.5*Math.sin(t*2);
 g.shadowColor=accent;g.shadowBlur=thinking?17:10+energy*24;g.strokeStyle=accent;g.lineWidth=8;
 g.beginPath();g.ellipse(256,135+Math.sin(t*1.5)*4,89+energy*9,22+energy*3,-.06,0,Math.PI*2);g.stroke();g.shadowBlur=0;
 g.strokeStyle='#192638';g.lineWidth=7;g.fillStyle='#fff9eb';g.lineJoin='round';
 g.beginPath();g.moveTo(126,345);g.bezierCurveTo(55,345,57,247,126,247);g.bezierCurveTo(108,171,205,152,235,208);g.bezierCurveTo(275,132,382,170,365,241);g.bezierCurveTo(455,215,478,348,391,348);g.bezierCurveTo(361,377,325,358,302,361);g.bezierCurveTo(279,381,240,375,222,361);g.bezierCurveTo(194,378,154,365,126,345);g.closePath();g.shadowColor='rgba(10,17,30,.22)';g.shadowBlur=18;g.shadowOffsetY=8;g.fill();g.shadowBlur=0;g.shadowOffsetY=0;g.stroke();
 ellipse(167,307,25,13,'#efb5b4');ellipse(345,307,25,13,'#efb5b4');
 g.strokeStyle='#192638';g.lineCap='round';g.lineWidth=7;
 const blink=Math.sin(t*1.7)> .993;
 if(blink){g.beginPath();g.moveTo(191,282);g.lineTo(222,282);g.moveTo(287,282);g.lineTo(318,282);g.stroke();}
 else{
  ellipse(209,285,12,15,'#192638');ellipse(302,285,12,15,'#192638');
  g.fillStyle='#fff9eb';g.fillRect(190,264,35,14);g.fillRect(284,264,35,14);
  g.beginPath();g.moveTo(192,278);g.lineTo(224,280);g.moveTo(285,280);g.lineTo(317,278);g.stroke();
  ellipse(212,287,3,3,'#fff');ellipse(305,287,3,3,'#fff');
 }
 if(speaking&&energy>.035){const mouth=(.25+.75*Math.max(0,Math.sin(t*27)))*energy;ellipse(256,321,10+mouth*6,4+mouth*25,'#192638');ellipse(256,326+mouth*7,5+mouth*3,2+mouth*6,'#e9a8a6');}
 else{g.beginPath();g.moveTo(243,318);g.quadraticCurveTo(256,326,269,318);g.lineWidth=5;g.stroke();}
 if(thinking){for(let i=0;i<3;i++){ellipse(218+i*38,391,5+3*(.5+.5*Math.sin(t*4-i)),5+3*(.5+.5*Math.sin(t*4-i)),accent);}}
 else if(speaking||question){for(let i=0;i<9;i++){const h=6+energy*(16+23*Math.sin(t*5+i*.7)**2);g.fillStyle=i%2?'#fff2cb':accent;roundRect(170+i*20,391-h/2,11,h,6);g.fill();}}
 else{ellipse(236,390,3+2*pulse,3+2*pulse,accent);ellipse(256,390,3+2*pulse,3+2*pulse,accent);ellipse(276,390,3+2*pulse,3+2*pulse,accent);}
 g.fillStyle='#1c2b43';roundRect(105,427,302,51,24);g.fill();g.strokeStyle='#edca7a';g.lineWidth=2;g.stroke();
 g.fillStyle='#fff3d4';g.textAlign='center';g.textBaseline='middle';g.font='bold 24px "Noto Sans JP",sans-serif';g.fillText(({question:'聞いてる…',thinking:'考え中…',speaking:'天の声',connecting:'準備中…',listening:'天の声AI'})[phase]||'天の声AI',256,454);
 if(demo){g.font='15px sans-serif';g.fillStyle='#d4b86f';g.fillText('デモ表示',256,50);}
 g.restore();requestAnimationFrame(frame);
}
window.batHeavenDiagnostics=()=>({mode:demo?'demo':'live',phase:state,connected:linked,level:energy});
requestAnimationFrame(frame);
})();