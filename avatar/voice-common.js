'use strict';
window.BatVoice={MODEL:'gpt-realtime-2.1-mini',SYSTEM:'bat-voice-v1',SLOT:'bat-voice-config-v1'};
window.BatVoice.Bus=class{
 constructor(onEvent,onReady){this.onEvent=onEvent;this.onReady=onReady;this.pending=new Map();this.n=0;this.ready=false;this.hash=new URLSearchParams(location.hash.slice(1));this.connect();}
 async digest(v){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return btoa(String.fromCharCode(...new Uint8Array(b)));}
 connect(){const ws=new WebSocket('ws://127.0.0.1:'+(Number(this.hash.get('port'))||4455));this.ws=ws;
 ws.onmessage=async e=>{try{const m=JSON.parse(e.data);
 if(m.op===0){const d={rpcVersion:1,eventSubscriptions:1};if(m.d.authentication)d.authentication=await this.digest((await this.digest((this.hash.get('p')||'')+m.d.authentication.salt))+m.d.authentication.challenge);ws.send(JSON.stringify({op:1,d}));}
 if(m.op===2){this.ready=true;await this.onReady?.();}
 if(m.op===7){const p=this.pending.get(m.d.requestId);if(p){this.pending.delete(m.d.requestId);clearTimeout(p.timer);m.d.requestStatus.result?p.resolve(m.d.responseData||{}):p.reject(Error(m.d.requestStatus.comment||'OBS request failed'));}}
 if(m.op===5&&m.d.eventType==='CustomEvent'){const d=m.d.eventData.eventData||m.d.eventData;if(d.system===BatVoice.SYSTEM)this.onEvent?.(d);}
 }catch(e){console.warn('Voice connection event failed');}};
 ws.onclose=()=>{this.ready=false;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('OBS disconnected'));}this.pending.clear();setTimeout(()=>this.connect(),2000);};
 ws.onerror=()=>{};}
 request(type,data={}){if(!this.ready)return Promise.reject(Error('OBS未接続'));return new Promise((resolve,reject)=>{const id=String(++this.n),timer=setTimeout(()=>{this.pending.delete(id);reject(Error('OBS timeout'));},7000);this.pending.set(id,{resolve,reject,timer});this.ws.send(JSON.stringify({op:6,d:{requestType:type,requestId:id,requestData:data}}));});}
 send(data){return this.request('BroadcastCustomEvent',{eventData:{system:BatVoice.SYSTEM,...data}});}
 async config(){const r=await this.request('GetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:BatVoice.SLOT});return r.slotValue||{};}
};
