'use strict';
(()=>{
const ink='#101010',paper='#fdfdfd',pink='#dba5a5';
function line(g,points,width=7){g.lineWidth=width;g.beginPath();points(g);g.stroke();}
function oval(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fill();}
function glint(g,x,y,scale=1){g.save();g.translate(x,y);g.rotate(-.12);oval(g,0,0,15*scale,7*scale,paper);g.restore();}
function eye(g,x,y,side,emotion,blink){
 g.save();g.translate(x,y);g.rotate(-.35);
 // The original white mask opening and its black edge remain visible.
 oval(g,0,0,52,57,paper);g.strokeStyle=ink;g.lineCap='round';g.lineJoin='round';
 if(blink){line(g,p=>{p.moveTo(-34,8);p.quadraticCurveTo(0,24,34,8);},7);g.restore();return;}
 if(emotion==='joy'){
  oval(g,0,2,36,43,ink);glint(g,-9,-18,1.1);glint(g,10,19,.65);
  oval(g,17,-3,7,7,paper);
  line(g,p=>{p.moveTo(-27,-46);p.quadraticCurveTo(0,-59,27,-47);},5);
 }else if(emotion==='anger'){
  g.save();g.beginPath();g.moveTo(-43,side<0?-29:-2);g.lineTo(43,side<0?-2:-29);g.lineTo(43,54);g.lineTo(-43,54);g.closePath();g.clip();
  oval(g,0,8,31,36,ink);glint(g,-8,-5,.75);g.restore();
  line(g,p=>{p.moveTo(-37,side<0?-31:-4);p.lineTo(37,side<0?-4:-31);},8);
 }else if(emotion==='sadness'){
  oval(g,0,12,34,37,ink);glint(g,-9,-3,1);glint(g,11,30,.7);
  line(g,p=>{p.moveTo(-32,side<0?-18:-36);p.quadraticCurveTo(0,-35,32,side<0?-36:-18);},6);
  g.fillStyle='#a9d8e8';g.strokeStyle='#6093ac';g.lineWidth=2;
  g.beginPath();g.moveTo(side*37,22);g.bezierCurveTo(side*24,39,side*23,53,side*36,53);g.bezierCurveTo(side*49,53,side*49,40,side*37,22);g.fill();g.stroke();
 }else{
  line(g,p=>{p.moveTo(-34,14);p.quadraticCurveTo(0,-27,34,14);},9);
  g.strokeStyle=pink;line(g,p=>{p.moveTo(-29,35);p.quadraticCurveTo(0,46,29,35);},5);
 }
 g.restore();
}
function mouth(g,emotion,open){
 g.save();g.translate(1920*.451,1080*.577);g.rotate(-.35);
 // A small face-only backplate leaves cheeks, mask, hands and the body intact.
 oval(g,0,3,70,76,paper);g.fillStyle=ink;g.strokeStyle=ink;g.lineCap='round';g.lineJoin='round';
 oval(g,0,-42,6,6,ink);
 if(emotion==='anger'){
  line(g,p=>{p.moveTo(-37,-19);p.quadraticCurveTo(-20,-2,0,-23);p.quadraticCurveTo(20,-2,37,-19);},7);
  if(open){g.beginPath();g.moveTo(-21,18);g.quadraticCurveTo(0,0,21,18);g.lineTo(18,43);g.quadraticCurveTo(0,55,-18,43);g.closePath();g.fill();g.fillStyle=paper;g.fillRect(-12,20,24,6);}
  else line(g,p=>{p.moveTo(-20,34);p.quadraticCurveTo(0,13,20,34);},7);
 }else if(emotion==='sadness'){
  line(g,p=>{p.moveTo(-36,-18);p.quadraticCurveTo(-16,-1,0,-20);p.quadraticCurveTo(16,-1,36,-18);},7);
  if(open){oval(g,0,31,16,23,ink);oval(g,0,44,9,6,pink);}
  else line(g,p=>{p.moveTo(-22,30);p.quadraticCurveTo(-10,17,0,25);p.quadraticCurveTo(10,17,22,30);},6);
 }else{
  line(g,p=>{p.moveTo(-42,-24);p.quadraticCurveTo(-37,0,-18,-3);p.quadraticCurveTo(0,-5,0,-23);p.quadraticCurveTo(0,-5,20,-3);p.quadraticCurveTo(40,-3,42,-24);},7);
  if(open){g.beginPath();g.moveTo(-20,2);g.quadraticCurveTo(0,9,20,2);g.lineTo(17,35);g.quadraticCurveTo(0,57,-17,35);g.closePath();g.fill();oval(g,0,35,12,8,pink);}
  else line(g,p=>{p.moveTo(-18,27);p.quadraticCurveTo(0,43,18,27);},6);
 }
 g.restore();
}
window.drawBatExpression=(g,emotion,open,blink)=>{
 if(!['joy','anger','sadness','delight'].includes(emotion))return;
 eye(g,1920*.367,1080*.504,-1,emotion,blink);
 eye(g,1920*.491,1080*.416,1,emotion,blink);
 mouth(g,emotion,open);
};
window.batExpressionNames={normal:'通常',joy:'喜',anger:'怒',sadness:'哀',delight:'楽'};
})();