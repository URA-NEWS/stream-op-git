import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../avatar/voice-engine.js',import.meta.url),'utf8');
function makeEngine(){
 const elements=Object.fromEntries(['helperStatus','helperMic','helperReply','prepareMic','helperStop'].map(k=>[k,{value:'comica',textContent:'',replaceChildren(){}}]));
 let bus,counter=0,permissionStops=0,micStops=0,apiCloses=0;const sent=[],sockets=[],intervals=[];
 class Bus{constructor(onEvent,onReady){this.onEvent=onEvent;this.ready=true;bus=this;queueMicrotask(onReady);}send(d){sent.push(d);return Promise.resolve();}config(){return Promise.resolve({endpoint:'https://voice.example',accessToken:'test-token',depth:'medium'});}}
 class Socket{constructor(url,protocols){this.readyState=1;this.messages=[];sockets.push(this);queueMicrotask(()=>this.onopen?.());}send(data){this.messages.push(JSON.parse(data));}close(){apiCloses++;this.readyState=3;}}
 class Context{constructor(){this.audioWorklet={addModule:()=>Promise.resolve()};this.destination={};}resume(){return Promise.resolve();}close(){return Promise.resolve();}createMediaStreamSource(){return{connect(n){return n;}};}createGain(){return{gain:{value:1},connect(){}};}}
 class Worklet{constructor(){this.port={};}connect(n){return n;}disconnect(){}}
 const config={label:'Comica EJoy D10 Pro TX',deviceId:'comica',kind:'audioinput'};
 const context={console,URL,crypto:{randomUUID:()=>String(++counter)},localStorage:{getItem(){return null;},setItem(){}},Date,AbortController,setTimeout,clearTimeout,setInterval:fn=>intervals.push(fn),queueMicrotask,Promise,AudioContext:Context,AudioWorkletNode:Worklet,WebSocket:Socket,BatVoice:{Bus,MODEL:'gpt-realtime-2.1-mini'},BatVoicePolicy:{instructions:'test',depths:{medium:{instructions:'medium',tokens:512},large:{instructions:'large',tokens:1024}}},document:{getElementById:k=>elements[k],createElement:()=>({})},window:{addEventListener(){}},btoa:v=>Buffer.from(v,'binary').toString('base64'),navigator:{mediaDevices:{enumerateDevices:async()=>[config],getUserMedia:async options=>({getTracks:()=>[{stop:()=>options.audio===true?permissionStops++:micStops++}]})}},fetch:async()=>Response.json({value:'ek_testing'})};
 vm.createContext(context);vm.runInContext(source,context);
 return{elements,get bus(){return bus;},sent,sockets,counts:()=>({permissionStops,micStops,apiCloses}),intervals};
}
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
test('ON captures mic; OFF releases the mic and the paid connection',async()=>{const e=makeEngine();await settle();await e.elements.prepareMic.onclick();await settle();assert.equal(e.counts().permissionStops,1);e.bus.onEvent({kind:'command',target:'1',action:'start'});await settle();assert.ok(e.sent.some(x=>x.state==='listening'));e.bus.onEvent({kind:'command',target:'1',action:'depth',depth:'large'});assert.equal(e.sockets[0].messages.at(-1).session.max_output_tokens,1024);e.bus.onEvent({kind:'command',target:'1',action:'stop'});await settle();assert.equal(e.counts().micStops,1);assert.equal(e.counts().apiCloses,1);assert.equal(e.sent.at(-1).state,'off');});
test('an engine ignores commands addressed to another helper',async()=>{const e=makeEngine();await settle();await e.elements.prepareMic.onclick();e.bus.onEvent({kind:'command',target:'different',action:'start'});await settle();assert.equal(e.sockets.length,0);});
