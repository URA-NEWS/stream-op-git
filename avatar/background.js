'use strict';
(()=>{
const image=new Image();let loaded=false;image.onload=()=>loaded=true;image.src='assets/stream-room.png?v=1';
window.drawBatBackground=(ctx,now)=>{
 const t=now/1000;ctx.save();ctx.fillStyle='#192231';ctx.fillRect(0,0,1920,1080);
 if(loaded)ctx.drawImage(image,0,0,1920,1080);
 ctx.save();ctx.beginPath();ctx.ellipse(1555,292,250,245,0,0,Math.PI*2);ctx.clip();
 const stars=[[1450,125],[1645,170],[1492,372],[1708,355],[1375,278],[1622,446]];
 for(let i=0;i<stars.length;i++){const [x,y]=stars[i],alpha=.2+.5*(.5+.5*Math.sin(t*(.7+i*.08)+i));ctx.globalAlpha=alpha;ctx.fillStyle='#fff3b8';ctx.beginPath();ctx.arc(x,y,2.4+Math.sin(t+i)*.7,0,Math.PI*2);ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle='#fff2c8';ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}
 ctx.globalAlpha=.1;ctx.fillStyle='#d7e2fa';for(let i=0;i<3;i++){const x=1305+((t*9+i*160)%510),y=235+i*74;for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(x+j*19,y-Math.sin(j)*9,29,13,0,0,Math.PI*2);ctx.fill();}}
 ctx.restore();
 const glow=ctx.createRadialGradient(190,540,20,190,540,260);glow.addColorStop(0,'rgba(255,196,103,'+(.035+.015*Math.sin(t*.8))+')');glow.addColorStop(1,'rgba(255,196,103,0)');ctx.fillStyle=glow;ctx.fillRect(0,200,540,750);
 for(let i=0;i<15;i++){const x=80+(i*131.7%1740),y=140+((i*67.3-t*(4+i%4)+1800)%720);ctx.globalAlpha=(.14+.09*Math.sin(t*.5+i))*(.5+.5*Math.sin(t*.8+i*1.7));ctx.fillStyle='#e9e5c2';ctx.beginPath();ctx.arc(x+Math.sin(t*.3+i)*14,y,1.5+i%2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
};
if(document.body.dataset.mode==='background'){const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d');const frame=t=>{window.drawBatBackground(ctx,t);requestAnimationFrame(frame);};requestAnimationFrame(frame);}
})();
