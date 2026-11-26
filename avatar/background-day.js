'use strict';
(()=>{
const image=new Image();let loaded=false;image.onload=()=>loaded=true;image.src='assets/stream-room-day.png?v=1';
window.drawBatBackground=(ctx,now)=>{
 const t=now/1000;ctx.save();ctx.fillStyle='#29313c';ctx.fillRect(0,0,1920,1080);
 if(loaded)ctx.drawImage(image,0,0,1920,1080);

 const glow=ctx.createRadialGradient(1450,580,20,1450,580,540);glow.addColorStop(0,'rgba(255,196,103,'+(.045+.008*Math.sin(t*.35))+')');glow.addColorStop(1,'rgba(255,196,103,0)');ctx.fillStyle=glow;ctx.fillRect(850,180,1070,900);
 for(let i=0;i<15;i++){const x=80+(i*131.7%1740),y=140+((i*67.3-t*(4+i%4)+1800)%720);ctx.globalAlpha=(.14+.09*Math.sin(t*.5+i))*(.5+.5*Math.sin(t*.8+i*1.7));ctx.fillStyle='#e9e5c2';ctx.beginPath();ctx.arc(x+Math.sin(t*.3+i)*14,y,1.5+i%2,0,Math.PI*2);ctx.fill();}
 ctx.restore();
};
if(document.body.dataset.mode==='background'){const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d');const frame=t=>{window.drawBatBackground(ctx,t);requestAnimationFrame(frame);};requestAnimationFrame(frame);}
})();
