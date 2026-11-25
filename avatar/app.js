'use strict';
(()=>{
const mode=document.body.dataset.mode, dock=mode==='dock', $=id=>document.getElementById(id);
const canvas=$('stage'), ctx=canvas.getContext('2d',{alpha:true});
const hash=new URLSearchParams(location.hash.slice(1));
const defaults={mic:'',threshold:-42,auto:true,smoking:true,kotatsu:false};
let cfg={...defaults}, socket, ready=false, retry, intentional=false, seq=0, waiting=new Map(), inputList=[], muted=false;
let db=-100, lastMeter=0, speaking=false, holdUntil=0, testUntil=0, gesture='normal', gestureUntil=0;
let nextGesture=performance.now()+50000, blinkUntil=0, nextBlink=performance.now()+2500, lastFrame=0, bounce=0;
let calibration=null, images={}, imagesReady=false, lastError='';
const system='bat-pngtuber-v3', slot='bat-pngtuber-v3';
const port=Number(hash.get('port'))||4455;
let password=hash.get('p')||sessionStorage.getItem(system+'-password')||'';
const setNotice=t=>{if(dock)$('notice').textContent=t;};
function connection(text,status){if(dock){$('connection').textContent=text;$('connection').className='badge '+(status||'');}}
function request(type,data={}){return new Promise((resolve,reject)=>{
 if(!ready)return reject(Error('OBSに未接続です'));
 const id=String(++seq);const timer=setTimeout(()=>{waiting.delete(id);reject(Error('OBSの応答を待っています'));},6000);
 waiting.set(id,{resolve,reject,timer});socket.send(JSON.stringify({op:6,d:{requestType:type,requestId:id,requestData:data}}));
});}
async function digest(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return btoa(String.fromCharCode(...new Uint8Array(b)));}
async function connect(){
 clearTimeout(retry);intentional=true;if(socket)socket.close();intentional=false;ready=false;connection('接続中');
 const ws=new WebSocket('ws://127.0.0.1:'+port);socket=ws;
 ws.onmessage=async e=>{if(ws!==socket)return;let m;try{m=JSON.parse(e.data);}catch{return;}
 try{
 if(m.op===0){const identify={rpcVersion:1,eventSubscriptions:65545};
 if(m.d.authentication)identify.authentication=await digest((await digest(password+m.d.authentication.salt))+m.d.authentication.challenge);
 ws.send(JSON.stringify({op:1,d:identify}));}
 if(m.op===2){ready=true;lastError='';connection('OBS 接続済み','ok');sessionStorage.setItem(system+'-password',password);await initialize();}
 if(m.op===7){const p=waiting.get(m.d.requestId);if(p){clearTimeout(p.timer);waiting.delete(m.d.requestId);m.d.requestStatus.result?p.resolve(m.d.responseData||{}):p.reject(Error(m.d.requestStatus.comment||'OBSの設定を確認してください'));}}
 if(m.op===5)handleEvent(m.d);
 }catch(error){setNotice(error.message);}
 };
 ws.onerror=()=>{lastError='OBSに接続できません。OBSを起動し、接続設定を確認してください。';connection('接続を確認','error');setNotice(lastError);};
 ws.onclose=e=>{if(ws!==socket)return;ready=false;speaking=false;db=-100;for(const p of waiting.values()){clearTimeout(p.timer);p.reject(Error('OBSの接続が切れました'));}waiting.clear();
 connection(e.code===4009?'パスワードを確認':'再接続中',e.code===4009?'error':'');
 if(e.code===4009){if(dock)$('connectPanel').open=true;setNotice('OBSのWebSocketパスワードを入力してください。');}
 if(!intentional)retry=setTimeout(connect,e.code===4009?10000:2500);};
}
function applySettings(next){cfg={...cfg,...next};cfg.threshold=Math.max(-60,Math.min(-15,Number(cfg.threshold)||-42));if(dock){
 $('threshold').value=cfg.threshold;$('thresholdValue').textContent=cfg.threshold+' dB';
 $('auto').checked=cfg.auto;$('smoking').checked=cfg.smoking;$('kotatsu').checked=cfg.kotatsu;
 if(inputList.some(i=>i.inputName===cfg.mic))$('mic').value=cfg.mic;
 $('gate').style.left=((cfg.threshold+70)/70*100)+'%';
}checkMute();}
async function checkMute(){if(!ready||!cfg.mic)return;try{muted=(await request('GetInputMute',{inputName:cfg.mic})).inputMuted;}catch{muted=false;}}
async function refreshInputs(){
 const [list,special]=await Promise.all([request('GetInputList'),request('GetSpecialInputs')]);
 inputList=list.inputs.filter(i=>/wasapi_input_capture|coreaudio_input_capture|pulse_input_capture|alsa_input_capture|jack_output_capture/.test(i.inputKind));
 if(cfg.mic&&!inputList.some(i=>i.inputName===cfg.mic)){const found=list.inputs.find(i=>i.inputName===cfg.mic);if(found)inputList.push(found);}
 if(!inputList.some(i=>i.inputName===cfg.mic))cfg.mic=special.mic1||inputList[0]?.inputName||'';
 if(dock){$('mic').replaceChildren();if(!inputList.length){const o=document.createElement('option');o.value='';o.textContent='マイクを追加してください';$('mic').append(o);}
 for(const i of inputList){const o=document.createElement('option');o.value=i.inputName;o.textContent=i.inputName;$('mic').append(o);}
 $('mic').value=cfg.mic;}
 await checkMute();if(dock)await refreshDevices();return list;
}
async function installOBS(){
 const sceneName='BAT キャラ配信',inputName='BAT キャラ（ブラウザ）';
 const scenes=await request('GetSceneList');if(!scenes.scenes.some(s=>s.sceneName===sceneName))await request('CreateScene',{sceneName});
 const url=new URL('overlay.html',location.href);url.hash=new URLSearchParams({p:password,port:String(port)}).toString();
 const inputSettings={url:url.href,width:1920,height:1080,fps:60,fps_custom:true,is_local_file:false,shutdown:false,restart_when_active:false,reroute_audio:true};
 const inputs=await request('GetInputList');if(inputs.inputs.some(i=>i.inputName===inputName)){
 await request('SetInputSettings',{inputName,inputSettings,overlay:true});const items=await request('GetSceneItemList',{sceneName});if(!items.sceneItems.some(i=>i.sourceName===inputName))await request('CreateSceneItem',{sceneName,sourceName:inputName,sceneItemEnabled:true});
 }else await request('CreateInput',{sceneName,inputName,inputKind:'browser_source',inputSettings,sceneItemEnabled:true});
 const special=await request('GetSpecialInputs');if(!special.mic1&&!inputs.inputs.some(i=>/wasapi_input_capture/.test(i.inputKind))){await request('CreateInput',{sceneName,inputName:'キャラ用マイク',inputKind:'wasapi_input_capture',inputSettings:{device_id:'default',use_device_timing:false},sceneItemEnabled:true});cfg.mic='キャラ用マイク';}
 const stream=await request('GetStreamStatus');if(!stream.outputActive)await request('SetCurrentProgramScene',{sceneName});
 setNotice('OBSにキャラを追加しました。話すと口が動きます。');
}
async function refreshDevices(){if(!cfg.mic)return;try{const [r,s]=await Promise.all([request('GetInputPropertiesListPropertyItems',{inputName:cfg.mic,propertyName:'device_id'}),request('GetInputSettings',{inputName:cfg.mic})]);$('device').replaceChildren();for(const item of r.propertyItems.filter(i=>i.itemEnabled)){const o=document.createElement('option');o.value=item.itemValue;o.textContent=item.itemName;$('device').append(o);}$('device').value=s.inputSettings.device_id||'default';}catch{}}
async function initialize(){
 if(dock&&hash.get('setup')==='1'&&!window.batSetupDone){await installOBS();window.batSetupDone=true;}

 try{const saved=await request('GetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:slot});if(saved.slotValue&&typeof saved.slotValue==='object')applySettings(saved.slotValue);}catch{}
 await refreshInputs();applySettings(cfg);
 if(dock){setNotice(cfg.mic?'準備完了。話すと口が動きます。':'「OBSマイクを追加」から入力を設定してください。');await sendEvent({kind:'hello'});}
}
function sendEvent(data){return request('BroadcastCustomEvent',{eventData:{system,...data}});}
async function save(){
 applySettings(cfg);await request('SetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:slot,slotValue:cfg});
 await sendEvent({kind:'settings',settings:cfg});
}
function handleEvent(e){
 if(e.eventType==='InputMuteStateChanged'&&e.eventData.inputName===cfg.mic)muted=e.eventData.inputMuted;
 if(e.eventType==='InputCreated'||e.eventType==='InputRemoved')refreshInputs().catch(()=>{});
 if(e.eventType==='InputVolumeMeters'){
 const input=e.eventData.inputs.find(i=>i.inputName===cfg.mic);
 if(input){const peaks=input.inputLevelsMul.map(c=>c[1]||0);const level=Math.max(0,...peaks);db=muted?-100:20*Math.log10(Math.max(1e-6,level));lastMeter=performance.now();
 if(calibration)calibration.push(db);}
 }
 if(e.eventType==='CustomEvent'){
 const d=e.eventData.eventData;if(!d||d.system!==system)return;
 if(d.kind==='settings')applySettings(d.settings||{});
 if(d.kind==='gesture')triggerGesture(d.gesture);
 if(d.kind==='test')testUntil=performance.now()+4500;
 if(d.kind==='hello'&&!dock)sendEvent({kind:'settings',settings:cfg}).catch(()=>{});
 }
}
function triggerGesture(name){if(!['normal','wave','scratch','smoke'].includes(name))return;gesture=name;gestureUntil=performance.now()+({normal:0,wave:4300,scratch:2900,smoke:6100}[name]);nextGesture=performance.now()+45000+Math.random()*45000;}
function clipEyePatches(image){
 ctx.save();ctx.beginPath();
 ctx.ellipse(1920*.367,1080*.504,1920*.047,1080*.079,-.35,0,Math.PI*2);
 ctx.ellipse(1920*.491,1080*.416,1920*.047,1080*.079,-.35,0,Math.PI*2);
 ctx.clip();ctx.drawImage(image,0,0,1920,1080);ctx.restore();
}
function clipMouth(image){ctx.save();ctx.beginPath();ctx.ellipse(1920*.451,1080*.577,1920*.041,1080*.073,-.35,0,Math.PI*2);ctx.clip();ctx.drawImage(image,0,0,1920,1080);ctx.restore();}
function frame(now){
 const dt=Math.min(.08,(now-lastFrame)/1000||.016);lastFrame=now;
 if(now-lastMeter>350)db=-100;
 const fake=now<testUntil&&Math.sin(now/105)>-.25;
 if(fake||(ready&&!muted&&db>=cfg.threshold)){speaking=true;holdUntil=now+125;}
 else if(now>holdUntil&&db<cfg.threshold-4)speaking=false;
 if(now>=nextBlink){blinkUntil=now+115;nextBlink=now+2800+Math.random()*3600;}
 const blink=now<blinkUntil;
 if(gesture!=='normal'&&now>gestureUntil)gesture='normal';
 if(cfg.auto&&!dock&&gesture==='normal'&&now>nextGesture){
 const pool=['wave','wave'];if(!cfg.kotatsu)pool.push('scratch');if(cfg.smoking)pool.push('smoke');const pick=pool[Math.floor(Math.random()*pool.length)];triggerGesture(pick);sendEvent({kind:'gesture',gesture:pick}).catch(()=>{});
 }
 bounce+=(Number(speaking)*4-bounce)*Math.min(1,dt*11);
 ctx.clearRect(0,0,1920,1080);
 if(imagesReady){
 const breath=Math.sin(now/680)*.0026;
 let angle=Math.sin(now/1700)*.0023;
 if(gesture==='wave')angle+=Math.sin(now/210)*.023;
 if(gesture==='scratch')angle+=Math.sin(now/60)*.007;
 ctx.save();ctx.translate(960,720-bounce);ctx.rotate(angle);ctx.scale(1+breath,1+breath);ctx.translate(-960,-720);
 const key=blink?'blink':(speaking?'talk':'idle');
 const base=gesture==='scratch'?images.scratch:gesture==='smoke'?images.smoke:images.idle;
 ctx.drawImage(base,0,0,1920,1080);
 if(gesture!=='smoke')clipMouth(speaking?images.talk:images.idle);
 if(blink)clipEyePatches(images[key]);
 ctx.restore();
 }
 if(dock){$('meter').style.width=Math.max(0,Math.min(100,(db+70)/70*100))+'%';$('volume').textContent=muted?'マイク消音':db>-90?Math.round(db)+' dB':'無音';
 $('mouth').textContent=speaking?'話しています':'口を閉じています';}
 requestAnimationFrame(frame);
}
async function loadImages(){
 const names=['idle','talk','blink','scratch','smoke'];
 await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=()=>reject(Error('キャラ画像を読み込めません: '+name));image.src='assets/'+name+'.png?v=3';})));
 imagesReady=true;
}
function guard(fn){return (...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>setNotice(e.message));}
if(dock){
 $('mic').onchange=guard(async()=>{cfg.mic=$('mic').value;await save();});
 $('refresh').onclick=guard(refreshInputs);
 $('device').onchange=guard(async()=>{await request('SetInputSettings',{inputName:cfg.mic,inputSettings:{device_id:$('device').value},overlay:true});setNotice('マイク機器を切り替えました。');});
 $('threshold').oninput=()=>{cfg.threshold=Number($('threshold').value);applySettings(cfg);};
 $('threshold').onchange=guard(save);
 for(const key of ['auto','smoking','kotatsu'])$(key).onchange=guard(async()=>{cfg[key]=$(key).checked;await save();});
 for(const button of document.querySelectorAll('[data-gesture]'))button.onclick=guard(async()=>{triggerGesture(button.dataset.gesture);await sendEvent({kind:'gesture',gesture:button.dataset.gesture});});
 $('test').onclick=guard(async()=>{testUntil=performance.now()+4500;await sendEvent({kind:'test'});setNotice('4秒間の口パクテスト。実際のマイク入力とは別です。');});
 $('calibrate').onclick=guard(async()=>{if(!cfg.mic)throw Error('先にマイクを選んでください。');calibration=[];setNotice('1秒間、周りの音量を測っています。');await new Promise(r=>setTimeout(r,1100));const samples=calibration;calibration=null;if(!samples.length)throw Error('マイクの音量を受信できません。OBSのマイクを確認してください。');samples.sort((a,b)=>a-b);cfg.threshold=Math.max(-55,Math.min(-20,Math.round(samples[Math.floor(samples.length*.9)]+10)));await save();setNotice('調整しました。話し声で口が動くか確認してください。');});
 $('addMic').onclick=guard(async()=>{const list=await request('GetInputList');if(list.inputs.some(i=>i.inputName==='キャラ用マイク'))cfg.mic='キャラ用マイク';else{const scene=await request('GetCurrentProgramScene');await request('CreateInput',{sceneName:scene.currentProgramSceneName,inputName:'キャラ用マイク',inputKind:'wasapi_input_capture',inputSettings:{device_id:'default',use_device_timing:false},sceneItemEnabled:true});cfg.mic='キャラ用マイク';}await refreshInputs();await save();});
 $('connect').onclick=()=>{password=$('password').value;connect();};
}
loadImages().catch(e=>{lastError=e.message;setNotice(e.message);});
connect();requestAnimationFrame(frame);
window.batAvatarDiagnostics=()=>({ready,imagesReady,mic:cfg.mic,threshold:cfg.threshold,db,muted,speaking,gesture,error:lastError,mode});
})();
