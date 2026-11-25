'use strict';
(()=>{
const W=1920,H=1080,ink='#101010',paper='#fdfdfd',pink='#dba5a5';
const names={joy:'喜',anger:'怒',sadness:'哀',delight:'楽'};
function oval(g,x,y,rx,ry,c){g.fillStyle=c;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function stroke(g,fn,width=6){g.lineWidth=width;g.beginPath();fn(g);g.stroke();}
function eye(g,x,y,side,emotion,blink){
 g.save();g.translate(x,y);g.rotate(-.35);
 oval(g,0,0,55,56,paper);g.strokeStyle=ink;g.lineCap='round';g.lineJoin='round';
 if(blink){stroke(g,p=>{p.moveTo(-29,6);p.quadraticCurveTo(0,18,29,6);});}
 else if(emotion==='delight'){stroke(g,p=>{p.moveTo(-28,11);p.quadraticCurveTo(0,-23,28,11);},7);}
 else{
  g.save();if(emotion==='anger'){g.beginPath();g.moveTo(-48,side<0?-21:0);g.lineTo(48,side<0?0:-21);g.lineTo(48,55);g.lineTo(-48,55);g.closePath();g.clip();}
  oval(g,0,emotion==='sadness'?7:1,31,37,ink);
  g.save();g.rotate(-.1);oval(g,-9,emotion==='sadness'?-7:-13,13,6,paper);oval(g,7,emotion==='sadness'?27:20,10,3,paper);g.restore();g.restore();
  if(emotion==='anger')stroke(g,p=>{p.moveTo(-34,side<0?-21:0);p.lineTo(34,side<0?0:-21);},7);
  if(emotion==='sadness'){g.fillStyle='#b1d7e7';g.strokeStyle='#6e9daf';g.lineWidth=2;g.beginPath();g.moveTo(side*35,22);g.bezierCurveTo(side*25,37,side*22,48,side*34,50);g.bezierCurveTo(side*47,51,side*48,39,side*35,22);g.fill();g.stroke();}
 }
 g.restore();
}
function mouth(g,emotion,open){
 g.save();g.translate(1920*.451,1080*.577);g.rotate(-.35);
 oval(g,0,1,62,67,paper);g.strokeStyle=ink;g.lineCap='round';g.lineJoin='round';
 if(emotion==='anger'||emotion==='sadness'){
  if(open){g.fillStyle=paper;g.beginPath();g.moveTo(-13,3);g.quadraticCurveTo(0,-4,13,3);g.quadraticCurveTo(20,30,0,29);g.quadraticCurveTo(-20,30,-13,3);g.fill();g.lineWidth=6;g.stroke();}
  else stroke(g,p=>{p.moveTo(-17,12);p.quadraticCurveTo(0,-3,17,12);});
 }else{
  // The lower opening touches both corners of the upper lip: ONE mouth.
  if(open){g.fillStyle=paper;g.beginPath();g.moveTo(-9,7);g.quadraticCurveTo(0,8,10,7);g.lineTo(7,27);g.quadraticCurveTo(0,37,-7,26);g.closePath();g.fill();stroke(g,p=>{p.moveTo(-9,7);p.lineTo(-7,26);p.quadraticCurveTo(0,37,7,27);p.lineTo(10,7);});}
  stroke(g,p=>{p.moveTo(-22,-9);p.bezierCurveTo(-25,8,-6,14,0,-3);p.bezierCurveTo(4,13,24,8,23,-9);});
 }
 g.restore();
}
function face(g,emotion,open,blink){eye(g,W*.367,H*.504,-1,emotion,blink);eye(g,W*.491,H*.416,1,emotion,blink);mouth(g,emotion,open);}
window.makeOriginalExpressionFrames=image=>{
 const base=document.createElement('canvas');base.width=W;base.height=H;const bg=base.getContext('2d');bg.transform(2.31100039,.06312966,-.06312966,2.31100039,-1505.98365482,-628.16518387);bg.drawImage(image,0,0);
 const sets={};for(const name of Object.keys(names)){sets[name]=[];for(let i=0;i<4;i++){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.drawImage(base,0,0);face(g,name,Boolean(i&1),i>=2);sets[name].push(c);}}
 return {base,sets};
};
window.originalExpressionNames=names;
})();