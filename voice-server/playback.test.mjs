import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
let bus,ctx,stopped=0;const starts=[],timers=[],events=[];
class Context{constructor(){ctx=this;this.currentTime=0;this.state='running';this.destination={};}resume(){return Promise.resolve();}createGain(){return{gain:{value:1},connect(){}};}createBuffer(ch,n,rate){return{duration:n/rate,getChannelData:()=>new Float32Array(n)};}createBufferSource(){return{connect(){},start(t){starts.push({t,duration:this.buffer.duration});},stop(){stopped++;}};}}
const scope={console,AudioContext:Context,atob:x=>Buffer.from(x,'base64').toString('binary'),window:{},setInterval(){},setTimeout(fn,ms){timers.push({fn,ms});},BatVoice:{Bus:class{constructor(fn,ready){bus=this;this.fn=fn;this.ready=true;queueMicrotask(ready);}async config(){return{volume:55};}async send(){}async request(type,data){events.push({type,data});}}}};
vm.runInNewContext(fs.readFileSync(new URL('../avatar/voice-playback.js',import.meta.url),'utf8'),scope);await new Promise(r=>setImmediate(r));
const pcm=Buffer.alloc(4800).toString('base64');
for(let i=0;i<60;i++){ctx.currentTime=i*.103;await bus.fn({kind:'audio',session:'one',pcm});}
for(let i=1;i<starts.length;i++)assert.ok(Math.abs(starts[i].t-starts[i-1].t-.1)<1e-8,'chunks must join without gaps');
assert.equal(scope.window.batVoicePlaybackDiagnostics().underruns,0);
assert.equal(events.length,0,'animation waits for actual playback');assert.equal(timers[0].ms,350);timers[0].fn();assert.equal(events[0].data.requestData.event_name,'bat-voice-display');
await bus.fn({kind:'audio-reset',session:'two'});const before=stopped;
for(let i=0;i<80;i++)await bus.fn({kind:'audio',session:'two',pcm});
assert.equal(stopped,before,'fast generation must not discard buffered speech after 2 seconds');
assert.ok(scope.window.batVoicePlaybackDiagnostics().bufferSeconds>7);
let unblock;ctx.resume=()=>new Promise(r=>unblock=r);const pending=bus.fn({kind:'audio',session:'two',pcm});await bus.fn({kind:'audio-reset',session:'three'});const count=starts.length;unblock();await pending;assert.equal(starts.length,count,'interrupted pending audio must remain stopped');
console.log(JSON.stringify({pass:true,contiguousChunks:60,jitterHandled:true,fastAudioPreserved:true,interruptRaceFixed:true}));

