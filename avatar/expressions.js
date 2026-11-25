'use strict';
(()=>{
// Mood accents are drawn outside the original silhouette. Never replace eyes or mouth.
window.drawBatMood=(g,mood,now)=>{
 if(mood==='normal')return;
 g.save();g.lineCap='round';g.lineJoin='round';g.globalAlpha=.87+.09*Math.sin(now/900);
 function star(x,y,s){g.save();g.translate(x,y);g.fillStyle='#f6d37d';g.beginPath();g.moveTo(0,-s);g.quadraticCurveTo(s*.18,-s*.18,s,0);g.quadraticCurveTo(s*.18,s*.18,0,s);g.quadraticCurveTo(-s*.18,s*.18,-s,0);g.quadraticCurveTo(-s*.18,-s*.18,0,-s);g.fill();g.restore();}
 if(mood==='joy'){
  g.save();g.translate(390,380);g.fillStyle='#e4a8ac';g.strokeStyle='#a76d79';g.lineWidth=4;g.beginPath();g.moveTo(0,29);g.bezierCurveTo(-54,-5,-35,-44,0,-19);g.bezierCurveTo(35,-44,54,-5,0,29);g.fill();g.stroke();g.restore();
  star(1240,305,21);star(1280,260,12);
 }else if(mood==='anger'){
  g.save();g.translate(1255,300);g.strokeStyle='#dd8a80';g.lineWidth=10;
  for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.beginPath();g.moveTo(11,-38);g.quadraticCurveTo(11,-11,37,-11);g.stroke();}g.restore();
 }else if(mood==='sadness'){
  g.strokeStyle='#77a5bc';g.fillStyle='#b3d9e8';g.lineWidth=4;
  for(const [x,y,s]of [[405,610,1],[383,690,.64]]){g.save();g.translate(x,y);g.scale(s,s);g.beginPath();g.moveTo(0,-28);g.bezierCurveTo(-10,-10,-28,13,-17,28);g.bezierCurveTo(-7,40,13,40,22,25);g.bezierCurveTo(31,9,10,-12,0,-28);g.fill();g.stroke();g.restore();}
 }else if(mood==='delight'){
  g.save();g.translate(390,430);g.strokeStyle='#f0d18a';g.fillStyle='#f0d18a';g.lineWidth=7;g.beginPath();g.moveTo(0,24);g.lineTo(0,-24);g.quadraticCurveTo(27,-18,28,-1);g.stroke();g.beginPath();g.ellipse(-10,27,14,10,-.35,0,Math.PI*2);g.fill();g.restore();star(1260,275,19);star(1303,310,10);
 }
 g.restore();
};
})();