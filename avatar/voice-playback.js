'use strict';
(()=>{let ctx=null,gain=null,tail=0,session='',volume=.55,epoch=0,underruns=0;const queued=new Set();
 function clear(){epoch++;for(const s of queued){try{s.stop();}catch{}}queued.clear();tail=0;}
 async function context(){if(!ctx){ctx=new AudioContext();gain=ctx.createGain();gain.gain.value=volume;gain.connect(ctx.destination);}await ctx.resume();return ctx;}
 const bus=new BatVoice.Bus(async d=>{
  if(d.kind==='audio-reset'){session=d.session;clear();}
  if(d.kind==='config'){volume=Math.max(0,Math.min(1,Number(d.volume)/100));if(gain)gain.gain.value=volume;}
  if(d.kind==='audio'){
   if(typeof d.pcm!=='string'||d.pcm.length>131072)return;
   if(d.session!==session){session=d.session;clear();}
   const expected=epoch;
   try{const c=await context();if(expected!==epoch||d.session!==session)return;const raw=atob(d.pcm);if(raw.length%2||!raw.length)return;const data=new DataView(Uint8Array.from(raw,x=>x.charCodeAt(0)).buffer),b=c.createBuffer(1,raw.length/2,24000),out=b.getChannelData(0);for(let i=0;i<out.length;i++)out[i]=data.getInt16(i*2,true)/32768;
    if(tail>c.currentTime+120)throw Error('Audio queue overflow');
    if(!tail)tail=c.currentTime+.35;else if(tail<c.currentTime){underruns++;tail=c.currentTime+.35;}
    const src=c.createBufferSource();src.buffer=b;src.connect(gain);src.onended=()=>queued.delete(src);queued.add(src);src.start(tail);tail+=b.duration;
   }catch{bus.send({kind:'playback-status',ready:false,message:'OBSのAI音声出力を確認してください。'}).catch(()=>{});}
  }
 },async()=>{const cfg=await bus.config();volume=(Number(cfg.volume)||55)/100;await context().catch(()=>{});});
 setInterval(()=>{if(!bus.ready){clear();return;}bus.send({kind:'playback-status',ready:ctx?.state==='running'}).catch(()=>{});},2000);
 window.batVoicePlaybackDiagnostics=()=>({queued:queued.size,bufferSeconds:Math.max(0,tail-(ctx?.currentTime||0)),underruns});
})();

