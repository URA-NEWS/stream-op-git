'use strict';
(async()=>{
const q=new URLSearchParams(location.search),key=q.get('asset')||'kotatsu',spec=window.BAT_PROP_MANIFEST[key],canvas=document.getElementById('prop'),ctx=canvas.getContext('2d',{alpha:true});
if(!spec){document.title='素材が見つかりません';return;}
document.title=spec.label;
canvas.width=spec.kind==='room'?1920:spec.crop.w;canvas.height=spec.kind==='room'?1080:spec.crop.h;
const hash=new URLSearchParams(location.hash.slice(1)),linked=hash.has('p');let cfg={background:true,roomSeparate:false,kotatsu:false,figure:true},image=null,lastVisible=null,ws,ready=false,n=0,pending=new Map();
function visible(){if(!linked)return true;if(spec.kind==='room')return cfg.background&&cfg.roomSeparate;return Boolean(cfg[spec.control]);}
function draw(){const show=visible();if(show===lastVisible&&spec.kind!=='room')return;lastVisible=show;ctx.clearRect(0,0,canvas.width,canvas.height);if(!show)return;if(image)ctx.drawImage(image,spec.crop.x,spec.crop.y,spec.crop.w,spec.crop.h,0,0,canvas.width,canvas.height);}
function apply(next){cfg={...cfg,...next};draw();}
if(spec.kind==='room'){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='background.js?v=5';s.onload=resolve;s.onerror=reject;document.head.append(s);});function tick(t){ctx.clearRect(0,0,1920,1080);if(visible()&&window.drawBatBackground)window.drawBatBackground(ctx,t);requestAnimationFrame(tick);}requestAnimationFrame(tick);}
else{image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='assets/'+spec.file+'?v=1';});draw();}
async function digest(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return btoa(String.fromCharCode(...new Uint8Array(b)));}
function request(type,data={}){return new Promise((resolve,reject)=>{const id=String(++n),timer=setTimeout(()=>{pending.delete(id);reject(Error('timeout'));},6000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({op:6,d:{requestType:type,requestId:id,requestData:data}}));});}
function connect(){
 ws=new WebSocket('ws://127.0.0.1:'+(Number(hash.get('port'))||4455));
 ws.onmessage=async e=>{const m=JSON.parse(e.data);try{
 if(m.op===0){const d={rpcVersion:1,eventSubscriptions:1};if(m.d.authentication)d.authentication=await digest((await digest((hash.get('p')||'')+m.d.authentication.salt))+m.d.authentication.challenge);ws.send(JSON.stringify({op:1,d}));}
 if(m.op===2){ready=true;const r=await request('GetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:'bat-pngtuber-v3'});if(r.slotValue)apply(r.slotValue);}
 if(m.op===7){const p=pending.get(m.d.requestId);if(p){clearTimeout(p.timer);pending.delete(m.d.requestId);m.d.requestStatus.result?p.resolve(m.d.responseData||{}):p.reject(Error('request failed'));}}
 if(m.op===5&&m.d.eventType==='CustomEvent'){const d=m.d.eventData.eventData||m.d.eventData;if(d.system==='bat-pngtuber-v3'&&d.kind==='settings')apply(d.settings||{});}
 }catch{}};
 ws.onclose=()=>{ready=false;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('closed'));}pending.clear();setTimeout(connect,2000);};ws.onerror=()=>{};
}
if(linked)connect();
})();