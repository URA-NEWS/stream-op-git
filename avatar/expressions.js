'use strict';
(()=>{
const W=1920,H=1080,white='#fdfdfd';
let art=null,cache=null,lastKey='',ready=false,report={};
function canvas(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function raster(image){const c=canvas(),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,W,H);return {canvas:c,data:g.getImageData(0,0,W,H)};}
function parts(r,region){
 const [ox,oy,w,h]=region,b=r.data.data,seen=new Uint8Array(w*h),result=[];
 function dark(p){const x=p%w,y=Math.floor(p/w),k=((oy+y)*W+ox+x)*4;return b[k+3]>150&&Math.max(b[k],b[k+1],b[k+2])<110;}
 for(let p=0;p<w*h;p++){
  if(seen[p]||!dark(p))continue;const queue=[p];seen[p]=1;let n=0,minX=w,minY=h,maxX=0,maxY=0;
  while(n<queue.length){const q=queue[n++],x=q%w,y=Math.floor(q/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const v of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(v>=0&&!seen[v]&&dark(v)){seen[v]=1;queue.push(v);}
  }
  if(queue.length<40||minX===0||minY===0||maxX===w-1||maxY===h-1)continue;
  const x=ox+minX-3,y=oy+minY-3,fw=maxX-minX+7,fh=maxY-minY+7,mask=new Uint8Array(fw*fh),erase=canvas(fw,fh),eg=erase.getContext('2d'),ed=eg.createImageData(fw,fh),ink=canvas(fw,fh),ig=ink.getContext('2d'),id=ig.createImageData(fw,fh);
  for(const q of queue){const px=q%w-minX+3,py=Math.floor(q/w)-minY+3;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=px+dx,yy=py+dy;if(xx>=0&&yy>=0&&xx<fw&&yy<fh)mask[yy*fw+xx]=1;}}
  for(let py=0;py<fh;py++)for(let px=0;px<fw;px++){const v=py*fw+px,k=v*4;if(!mask[v])continue;ed.data[k]=ed.data[k+1]=ed.data[k+2]=253;ed.data[k+3]=255;const s=((y+py)*W+x+px)*4,lum=Math.min(b[s],b[s+1],b[s+2]);id.data[k]=id.data[k+1]=id.data[k+2]=10;id.data[k+3]=Math.round(Math.max(0,Math.min(1,(253-lum)/180))*b[s+3]);}
  eg.putImageData(ed,0,0);ig.putImageData(id,0,0);
  result.push({x,y,w:fw,h:fh,cx:x+fw/2,cy:y+fh/2,pixels:queue.length,ink,erase});
 }
 return result.sort((a,b)=>b.pixels-a.pixels);
}
function eyePatch(g,image){
 g.save();g.beginPath();g.ellipse(W*.367,H*.504,W*.047,H*.079,-.35,0,Math.PI*2);g.ellipse(W*.491,H*.416,W*.047,H*.079,-.35,0,Math.PI*2);g.clip();g.drawImage(image,0,0,W,H);g.restore();
}
function mouthPatch(g,image){g.save();g.beginPath();g.ellipse(W*.451,H*.577,W*.041,H*.073,-.35,0,Math.PI*2);g.clip();g.drawImage(image,0,0,W,H);g.restore();}
function glyph(g,p,cx=p.cx,cy=p.cy,sx=1,sy=1){g.save();g.translate(cx,cy);g.scale(sx,sy);g.drawImage(p.ink,-p.w/2,-p.h/2);g.restore();}
function smileEye(g,p,base,flip){
 g.save();g.translate(base.cx,base.cy+3);g.rotate(-.35);g.scale(1,flip?-1:1);g.rotate(.35);g.drawImage(p.ink,-p.w/2,-p.h/2);g.restore();
}
function tears(g,eye,side){
 g.save();g.translate(eye.cx,eye.cy);g.rotate(-.35);g.fillStyle='#a9d5e6';g.strokeStyle='#182027';g.lineWidth=3;g.lineJoin='round';
 g.beginPath();g.moveTo(side*25,28);g.bezierCurveTo(side*20,53,side*36,74,side*26,95);g.bezierCurveTo(side*16,112,side*2,96,side*8,80);g.bezierCurveTo(side*15,60,side*10,40,side*14,29);g.closePath();g.fill();g.stroke();g.restore();
}
function cigarette(g){g.save();g.translate(916,621);g.rotate(-.12);g.lineWidth=3;g.strokeStyle='#101010';g.fillStyle=white;g.beginPath();g.rect(0,-8,125,16);g.fill();g.stroke();g.fillStyle='#e8bb69';g.fillRect(1,-6,27,12);g.fillStyle='#e88a38';g.beginPath();g.ellipse(126,0,5,8,0,0,Math.PI*2);g.fill();g.stroke();g.restore();}
function base(pose){
 const c=canvas(),g=c.getContext('2d');
 if(pose==='normal'){g.save();g.transform(2.31100039,.06312966,-.06312966,2.31100039,-1505.98365482,-628.16518387);g.drawImage(art.images.body,0,0);g.restore();}
 else g.drawImage(art.images[pose],0,0,W,H);
 eyePatch(g,art.images.idle);mouthPatch(g,art.images.idle);
 // Remove the approved source ink, including the separate nose dot and chin dash.
 // Mask edges, cheeks, head silhouette, hands, costume and all other pixels stay intact.
 for(const p of [...art.eyes,...art.mouthParts])g.drawImage(p.erase,p.x,p.y);
 return c;
}
function frame(b,emotion,open,blink,pose){
 const c=canvas(),g=c.getContext('2d');g.drawImage(b,0,0);
 art.eyes.forEach((eye,i)=>{
  if(blink){glyph(g,art.blinks[i],eye.cx,eye.cy+3);}
  else if(emotion==='delight'){smileEye(g,art.blinks[i],eye,true);}
  else if(emotion==='anger'){
   g.save();g.translate(eye.cx,eye.cy);g.rotate(-.35);g.beginPath();const side=i===0?-1:1;
   g.moveTo(-55,side<0?-24:-3);g.lineTo(55,side<0?-3:-24);g.lineTo(55,65);g.lineTo(-55,65);g.closePath();g.clip();g.rotate(.35);g.drawImage(eye.ink,-eye.w/2+(i===0?3:-3),-eye.h/2+4);g.restore();
  }else glyph(g,eye,eye.cx,eye.cy,emotion==='joy'?1.08:1,emotion==='joy'?1.08:1);
  if(emotion==='sadness')tears(g,eye,i===0?-1:1);
 });
 const p=open?art.openMouth:art.closedMouth;
 if(open&&emotion==='sadness'){g.save();g.translate(p.cx,p.y);g.scale(1,1.1);g.drawImage(p.ink,-p.w/2,0);g.restore();}
 else glyph(g,p);
 if(pose==='smoke')cigarette(g);
 return c;
}
window.prepareBatEmotions=images=>{
 const idle=raster(images.idle),talk=raster(images.talk),blink=raster(images.blink);
 const regions=[[648,478,124,136],[878,383,132,136]];
 const eyes=regions.map(r=>parts(idle,r)[0]),blinks=regions.map(r=>parts(blink,r)[0]);
 const mouthParts=parts(idle,[785,540,200,170]),openMouth=parts(talk,[785,540,200,170])[0],closedMouth=mouthParts[0];
 if(eyes.some(p=>!p)||blinks.some(p=>!p)||!openMouth||!closedMouth)throw Error('表情用の目・口を読み取れません');
 art={images,eyes,blinks,mouthParts,closedMouth,openMouth};ready=true;cache=null;lastKey='';
 report={ready:true,source:'existing-approved-raster-parts',mouthComponentsPerFrame:1,sourceMouth:{closed:{x:closedMouth.x,y:closedMouth.y,w:closedMouth.w,h:closedMouth.h},open:{x:openMouth.x,y:openMouth.y,w:openMouth.w,h:openMouth.h}},eyes:eyes.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h})),frameCount:4};
};
window.drawBatEmotion=(g,emotion,open,blink,pose)=>{
 if(!ready||!['joy','anger','sadness','delight'].includes(emotion))return false;
 pose=['scratch','smoke'].includes(pose)?pose:'normal';const key=emotion+'/'+pose;
 if(key!==lastKey){const b=base(pose);cache=[frame(b,emotion,false,false,pose),frame(b,emotion,true,false,pose),frame(b,emotion,false,true,pose),frame(b,emotion,true,true,pose)];lastKey=key;const before=b.getContext('2d').getImageData(0,0,W,H).data,after=cache[0].getContext('2d').getImageData(0,0,W,H).data;let changed=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x>=620&&x<=1060&&y>=370&&y<=720)continue;const k=(y*W+x)*4;if(before[k]!==after[k]||before[k+1]!==after[k+1]||before[k+2]!==after[k+2]||before[k+3]!==after[k+3])changed++;}report.bodyPixelsChangedOutsideFace=changed;}
 g.drawImage(cache[(blink?2:0)+(open?1:0)],0,0);return true;
};

window.paintBatEmotionThumbnail=(target,emotion)=>{
 if(!ready)return;const c=canvas(),g=c.getContext('2d');
 if(emotion==='normal'){g.save();g.transform(2.31100039,.06312966,-.06312966,2.31100039,-1505.98365482,-628.16518387);g.drawImage(art.images.body,0,0);g.restore();eyePatch(g,art.images.idle);mouthPatch(g,art.images.idle);}
 else window.drawBatEmotion(g,emotion,false,false,'normal');
 const t=target.getContext('2d');t.clearRect(0,0,target.width,target.height);t.drawImage(c,615,360,480,380,0,0,target.width,target.height);
};

window.batEmotionDiagnostics=()=>({...report,currentFrames:lastKey});
})();