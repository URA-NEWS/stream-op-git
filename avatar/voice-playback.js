'use strict';
(()=>{let ctx=null,gain=null,tail=0,session='',volume=.55;const queued=new Set();
 function clear(){for(const s of queued){try{s.stop();}catch{}}queued.clear();tail=0;}
 async function context(){if(!ctx){ctx=new AudioContext();gain=ctx.createGain();gain.gain.value=volume;gain.connect(ctx.destination);}await ctx.resume();return ctx;}
 const bus=new BatVoice.Bus(async d=>{
  if(d.kind==='audio-reset'){session=d.session;clear();}
  if(d.kind==='config'){volume=Math.max(0,Math.min(1,Number(d.volume)/100));if(gain)gain.gain.value=volume;}
  if(d.kind==='audio'){
   if(typeof d.pcm!=='string'||d.pcm.length>131072)return;
   if(d.session!==session){session=d.session;clear();}
   try{const c=await context(),raw=atob(d.pcm);if(raw.length%2)return;const data=new DataView(Uint8Array.from(raw,x=>x.charCodeAt(0)).buffer),b=c.createBuffer(1,raw.length/2,24000),out=b.getChannelData(0);for(let i=0;i<out.length;i++)out[i]=data.getInt16(i*2,true)/32768;
    if(tail>c.currentTime+2)clear();const src=c.createBufferSource();src.buffer=b;src.connect(gain);src.onended=()=>queued.delete(src);queued.add(src);tail=Math.max(c.currentTime+.06,tail);src.start(tail);tail+=b.duration;
   }catch{bus.send({kind:'playback-status',ready:false,message:'OBSのAI音声出力を確認してください。'}).catch(()=>{});}
  }
 },async()=>{const cfg=await bus.config();volume=(Number(cfg.volume)||55)/100;await context().catch(()=>{});});
 setInterval(()=>{if(!bus.ready){clear();return;}bus.send({kind:'playback-status',ready:ctx?.state==='running'}).catch(()=>{});},2000);
})();