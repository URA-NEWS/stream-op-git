'use strict';
(()=>{
const mode=document.body.dataset.mode, dock=mode==='dock', $=id=>document.getElementById(id);
const canvas=$('stage'), ctx=canvas.getContext('2d',{alpha:true});
const hash=new URLSearchParams(location.hash.slice(1));
const motionNames={scratch:'ぽりぽり',smoke:'一服',fart:'おなら'};
const expressionNames={normal:'通常',joy:'喜',anger:'怒',sadness:'哀',delight:'楽'};
const defaults={angerMarkScale:2.4,expression:'normal',autoMotions:['scratch','smoke'],autoInterval:60,mic:'',threshold:-42,auto:true,smoking:true,kotatsu:false,roomSeparate:false,figure:true,scale:100,posX:0,posY:0,sfxVolume:35,background:true};
let cfg={...defaults}, socket, ready=false, retry, intentional=false, seq=0, waiting=new Map(), inputList=[], muted=false;
let lastMouthOpen=false;
let rmsDb=-100,mouthPhase=0,manualBlinkUntil=0,lastShownGesture='';
let db=-100, lastMeter=0, speaking=false, holdUntil=0, testUntil=0, gesture='normal', gestureUntil=0;
let autoScheduleSignature='';let nextGesture=performance.now()+60000,autoCursor=0, blinkUntil=0, nextBlink=performance.now()+2500, lastFrame=0, bounce=0;
let fartStart=-10000;let persistTimer=null,liveSettingsFrame=null;
const clientId=crypto.randomUUID();let settingsSequence=0;const receivedSettings=new Map();let paletteReport={};
let calibration=null, images={}, imagesReady=false, lastError='';
const system='bat-pngtuber-v3', slot='bat-pngtuber-v3';
let port=Number(hash.get('port'))||4455;
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
function applySettings(next){const previousMic=cfg.mic;
 if(!Object.prototype.hasOwnProperty.call(next,'autoMotions')&&Object.prototype.hasOwnProperty.call(next,'smoking'))next={...next,autoMotions:['scratch',...(next.smoking?['smoke']:[])]};
 cfg={...cfg,...next};cfg.angerMarkScale=Math.max(.7,Math.min(4,Number(cfg.angerMarkScale)||2.4));cfg.expression=Object.prototype.hasOwnProperty.call(expressionNames,cfg.expression)?cfg.expression:'normal';cfg.autoMotions=Array.isArray(cfg.autoMotions)?[...new Set(cfg.autoMotions.filter(k=>Object.prototype.hasOwnProperty.call(motionNames,k)))]:[...defaults.autoMotions];cfg.autoInterval=Math.max(10,Math.min(600,Math.round(Number(cfg.autoInterval)||60)));
 const nextAutoSignature=JSON.stringify([cfg.auto,cfg.autoMotions,cfg.autoInterval,cfg.kotatsu]);if(autoScheduleSignature!==nextAutoSignature){autoScheduleSignature=nextAutoSignature;nextGesture=performance.now()+cfg.autoInterval*1000;autoCursor=0;}cfg.threshold=Math.max(-60,Math.min(-15,Number(cfg.threshold)||-42));cfg.scale=Math.max(30,Math.min(200,Number(cfg.scale)||100));cfg.posX=Math.max(-960,Math.min(960,Number(cfg.posX)||0));cfg.posY=Math.max(-540,Math.min(540,Number(cfg.posY)||0));cfg.sfxVolume=Math.max(0,Math.min(100,Number(cfg.sfxVolume)||0));if(dock){
 $('port').value=port;$('angerMarkSize').value=Math.round(cfg.angerMarkScale*100);$('angerMarkSizeValue').textContent=Math.round(cfg.angerMarkScale*100)+'%';
 for(const key of ['scale','posX','posY','sfxVolume']){$(key).value=cfg[key];$(key+'Value').textContent=cfg[key]+(key==='scale'||key==='sfxVolume'?'%':' px');}
 $('threshold').value=cfg.threshold;$('thresholdValue').textContent=cfg.threshold+' dB';
 $('auto').checked=cfg.auto;
 for(const b of document.querySelectorAll('[data-expression]')){const selected=b.dataset.expression===cfg.expression;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('active',selected);}
 for(const input of document.querySelectorAll('[data-auto-motion]'))input.checked=cfg.autoMotions.includes(input.dataset.autoMotion);
 $('autoInterval').value=cfg.autoInterval;$('autoIntervalValue').textContent=cfg.autoInterval+' 秒';
 const pool=eligibleAutoMotions();$('autoSummary').textContent=!cfg.auto?'自動モーションは停止中':pool.length?pool.map(k=>motionNames[k]).join(' → ')+' ／ '+cfg.autoInterval+'秒ごと':'モーション未選択。自動再生は待機中';$('kotatsu').checked=cfg.kotatsu;$('background').checked=cfg.background;if($('figure'))$('figure').checked=cfg.figure;
 if(inputList.some(i=>i.inputName===cfg.mic))$('mic').value=cfg.mic;
 $('gate').style.left=((cfg.threshold+70)/70*100)+'%';
}if(previousMic!==cfg.mic)checkMute();}
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
 const special=await request('GetSpecialInputs');if(!special.mic1){const available=inputs.inputs.find(i=>/wasapi_input_capture|coreaudio_input_capture|pulse_input_capture/.test(i.inputKind));if(available){const items=await request('GetSceneItemList',{sceneName});if(!items.sceneItems.some(i=>i.sourceName===available.inputName))await request('CreateSceneItem',{sceneName,sourceName:available.inputName,sceneItemEnabled:true});cfg.mic=available.inputName;}else{await request('CreateInput',{sceneName,inputName:'キャラ用マイク',inputKind:'wasapi_input_capture',inputSettings:{device_id:'default',use_device_timing:false},sceneItemEnabled:true});cfg.mic='キャラ用マイク';}}
 await window.installBatPropScene(request,{sceneName,password,port,config:cfg,baseURL:location.href});
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
function sendEvent(data){return request('BroadcastCustomEvent',{eventData:{system,sender:clientId,...data}});}
function publishSettings(){
 if(liveSettingsFrame!==null){cancelAnimationFrame(liveSettingsFrame);liveSettingsFrame=null;}
 return sendEvent({kind:'settings',sender:clientId,sequence:++settingsSequence,settings:{...cfg}});
}
function queueLiveSettings(){
 if(liveSettingsFrame!==null)return;
 liveSettingsFrame=requestAnimationFrame(()=>{liveSettingsFrame=null;publishSettings().catch(e=>setNotice(e.message));});
}
function persistSettings(){return request('SetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:slot,slotValue:{...cfg}});}
async function save(){
 clearTimeout(persistTimer);applySettings(cfg);
 const live=publishSettings();await Promise.all([live,persistSettings()]);
}
function handleEvent(e){
 if(e.eventType==='InputMuteStateChanged'&&e.eventData.inputName===cfg.mic)muted=e.eventData.inputMuted;
 if(e.eventType==='InputCreated'||e.eventType==='InputRemoved')refreshInputs().catch(()=>{});
 if(e.eventType==='InputVolumeMeters'){
 const input=e.eventData.inputs.find(i=>i.inputName===cfg.mic);
 if(input){const peaks=input.inputLevelsMul.map(c=>c[1]||0);const level=Math.max(0,...peaks);rmsDb=20*Math.log10(Math.max(1e-6,...input.inputLevelsMul.map(c=>c[0]||0)));db=muted?-100:20*Math.log10(Math.max(1e-6,level));lastMeter=performance.now();
 if(calibration)calibration.push(db);}
 }
 if(e.eventType==='CustomEvent'){
 const d=e.eventData.eventData||e.eventData;if(!d||d.system!==system)return;
 if(d.kind==='sfx-error')setNotice('効果音の再生を確認できません。');
 if(d.kind==='settings'&&d.sender!==clientId){
 const prior=receivedSettings.get(d.sender)||0;
 if(!d.sender||!d.sequence||d.sequence>prior){if(d.sender)receivedSettings.set(d.sender,d.sequence);applySettings(d.settings||{});}
 }
 if(d.kind==='gesture'&&d.sender!==clientId)triggerGesture(d.gesture);
 if(d.kind==='test')testUntil=performance.now()+4500;
 if(d.kind==='diagnostics')sendEvent({kind:'diagnostics-response',mode,build:'three-references-v8',emotions:window.batEmotionDiagnostics?.(),expression:cfg.expression,mouthOpen:lastMouthOpen,autoMotions:eligibleAutoMotions(),autoInterval:cfg.autoInterval,palette:paletteReport,ready,imagesReady,mic:cfg.mic,sfxVolume:cfg.sfxVolume,error:lastError,gesture,layout:{scale:cfg.scale,posX:cfg.posX,posY:cfg.posY}}).catch(()=>{});
 if(d.kind==='hello'&&!dock)sendEvent({kind:'settings',settings:cfg}).catch(()=>{});
 }
}
function playFartSound(){if(dock||cfg.sfxVolume<=0)return;const audio=new Audio('assets/fart-real.mp3?v=1');audio.volume=cfg.sfxVolume/100;audio.play().catch(error=>{lastError='効果音: '+error.name+' '+error.message;sendEvent({kind:'sfx-error',message:lastError}).catch(()=>{});});}
function triggerGesture(name){if(!['normal','scratch','smoke','fart'].includes(name))return;if(name==='fart'){fartStart=performance.now();playFartSound();}gesture=name;gestureUntil=performance.now()+({normal:0,wave:4300,scratch:2900,smoke:6100,fart:1800,blink:420,smile:1600}[name]);}
function clipEyePatches(image){
 ctx.save();ctx.beginPath();
 ctx.ellipse(1920*.367,1080*.504,1920*.047,1080*.079,-.35,0,Math.PI*2);
 ctx.ellipse(1920*.491,1080*.416,1920*.047,1080*.079,-.35,0,Math.PI*2);
 ctx.clip();ctx.drawImage(image,0,0,1920,1080);ctx.restore();
}
function clipMouth(image){ctx.save();ctx.beginPath();ctx.ellipse(1920*.451,1080*.577,1920*.041,1080*.073,-.35,0,Math.PI*2);ctx.clip();ctx.drawImage(image,0,0,1920,1080);ctx.restore();}
function drawCigaretteSmoke(now){const time=now/1000;ctx.save();for(let i=0;i<4;i++){const t=(time+i*.85)%3.4/3.4;const x=1040+Math.sin(time*.9+i)*t*30,y=615-t*245;ctx.globalAlpha=Math.sin(Math.PI*t)*.44;ctx.strokeStyle='#dce3ec';ctx.lineWidth=5+6*t;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-22,y-25,x+29,y-48,x+5,y-80);ctx.stroke();}ctx.restore();}
function drawFart(now){const age=(now-fartStart)/1000;if(age<0||age>1.8)return;const t=age/1.8;ctx.save();ctx.globalAlpha=Math.min(1,t*10)*Math.pow(1-t,1.4);for(let i=0;i<7;i++){const k=i/6;const x=1470+t*(165+k*110)+Math.sin(i*2.1)*25;const y=918-t*(35+k*70)+Math.cos(i*1.7)*30;const radius=(24+18*Math.sin(i*1.3)**2)*(0.6+t*1.7);ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=i%2?'#dce9b7':'#e9efce';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#a7bb83';ctx.stroke();}ctx.restore();}
function eligibleAutoMotions(){return cfg.autoMotions.filter(k=>!(cfg.kotatsu&&k==='scratch'));}
function runAutoMotion(now){
 if(!cfg.auto||dock||gesture!=='normal'||now<nextGesture)return;
 const pool=eligibleAutoMotions();nextGesture=now+cfg.autoInterval*1000;
 if(!pool.length)return;
 const pick=pool[autoCursor%pool.length];autoCursor=(autoCursor+1)%pool.length;
 triggerGesture(pick);sendEvent({kind:'gesture',gesture:pick}).catch(()=>{});
}
async function chooseExpression(name){if(!Object.prototype.hasOwnProperty.call(expressionNames,name))return;cfg.expression=name;await save();setNotice(expressionNames[name]+'の表情を保持。話すと口パクします。');}

function frame(now){
 const dt=Math.min(.08,(now-lastFrame)/1000||.016);lastFrame=now;
 if(now-lastMeter>350)db=-100;
 const fake=now<testUntil&&Math.sin(now/105)>-.25;
 if(fake||(ready&&!muted&&db>=cfg.threshold)){speaking=true;holdUntil=now+125;}
 else if(now>holdUntil&&db<cfg.threshold-4)speaking=false;
 if(now>=nextBlink){blinkUntil=now+115;nextBlink=now+2800+Math.random()*3600;}
 const blink=now<blinkUntil||now<manualBlinkUntil;
 if(gesture!=='normal'&&now>gestureUntil)gesture='normal';
 runAutoMotion(now);
 const energy=Math.max(0,Math.min(1,(rmsDb-cfg.threshold+8)/25));mouthPhase+=dt*(3.4+energy*2.1+.35*Math.sin(now/580))*Math.PI*2;
 const mouthOpen=speaking&&Math.sin(mouthPhase)>-.1;lastMouthOpen=mouthOpen;
 ctx.clearRect(0,0,1920,1080);if(cfg.background&&(dock||!cfg.roomSeparate)&&typeof window.drawBatBackground==='function')window.drawBatBackground(ctx,now);
 if(imagesReady){
 
 ctx.save();ctx.translate(cfg.posX,cfg.posY);ctx.translate(960,540);ctx.scale(cfg.scale/100,cfg.scale/100);ctx.translate(-960,-540);
 
 drawFart(now);
 const drawn=cfg.expression!=='normal'&&window.drawBatEmotion?.(ctx,cfg.expression,mouthOpen,blink,gesture,cfg.angerMarkScale);
 if(!drawn){
 const base=gesture==='scratch'?images.scratch:gesture==='smoke'?images.smoke:images.body;
 if(base===images.body){ctx.save();ctx.transform(2.31100039,0.06312966,-0.06312966,2.31100039,-1505.98365482,-628.16518387);ctx.drawImage(images.body,0,0);ctx.restore();}else ctx.drawImage(base,0,0,1920,1080);
 if(gesture!=='smoke')clipMouth(mouthOpen?images.talk:images.idle);
 clipEyePatches(blink?images.blink:images.idle);
 

 }
 if(gesture==='smoke')drawCigaretteSmoke(now);
 ctx.restore();
 }
 if(dock)window.drawBatPropPreview?.(ctx,cfg);
 if(dock){if(gesture!==lastShownGesture){lastShownGesture=gesture;for(const b of document.querySelectorAll('[data-gesture]'))b.classList.toggle('active',b.dataset.gesture===gesture);}$('meter').style.width=Math.max(0,Math.min(100,(db+70)/70*100))+'%';$('volume').textContent=muted?'マイク消音':db>-90?Math.round(db)+' dB':'無音';
 $('mouth').textContent=gesture==='smile'?'にっこり':speaking?'話しています':'待機中';}
 requestAnimationFrame(frame);
}

function normalizeMotionPalette(){
 // Match every expressive layer to the original body, without changing anatomy or alpha.
 const W=1920,H=1080;
 function raster(image,body=false){const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{willReadFrequently:true});if(body)g.transform(2.31100039,0.06312966,-0.06312966,2.31100039,-1505.98365482,-628.16518387);g.drawImage(image,0,0,body?image.width:W,body?image.height:H);return {canvas:c,g,data:g.getImageData(0,0,W,H)};}
 function median(a){a.sort((x,y)=>x-y);return a[Math.floor(a.length/2)]||0;}
 function sample(data,u,v){const out=[[],[],[]],b=data.data;for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const k=((Math.round(v*H)+dy)*W+Math.round(u*W)+dx)*4;if(b[k+3]>240)for(let c=0;c<3;c++)out[c].push(b[k+c]);}return out.map(median);}
 function family(r,g,b){if(r-g>25&&r-b>15)return b>g*.7?'pink':'gold';return 'neutral';}
 function colors(data){const bins={pink:[[],[],[]],gold:[[],[],[]]};const b=data.data;for(let k=0;k<b.length;k+=16){if(b[k+3]<240)continue;const f=family(b[k],b[k+1],b[k+2]);if(bins[f])for(let c=0;c<3;c++)bins[f][c].push(b[k+c]);}return Object.fromEntries(Object.entries(bins).map(([f,v])=>[f,v.map(median)]));}
 const reference=raster(images.body,true),target={head:sample(reference.data,.43,.30),suit:sample(reference.data,.59,.82),white:sample(reference.data,.39,.66),...colors(reference.data)};
 function interpolate(value,knots,values){for(let i=1;i<knots.length;i++)if(value<=knots[i])return values[i-1]+(value-knots[i-1])*(values[i]-values[i-1])/Math.max(1,knots[i]-knots[i-1]);return values[values.length-1];}
 paletteReport.reference=target;
 for(const name of ['idle','talk','blink','scratch','smoke']){
  const layer=raster(images[name]),src={head:sample(layer.data,.43,.30),suit:sample(layer.data,.59,.82),white:sample(layer.data,.39,.66),...colors(layer.data)},b=layer.data.data;
  const neutral=[0,1,2].map(c=>Array.from({length:256},(_,v)=>interpolate(v,[0,src.head[c],src.suit[c],src.white[c],255],[0,target.head[c],target.suit[c],target.white[c],255])));
  for(let k=0;k<b.length;k+=4){if(!b[k+3])continue;const f=family(b[k],b[k+1],b[k+2]);for(let c=0;c<3;c++)b[k+c]=f==='neutral'?neutral[c][b[k+c]]:Math.max(0,Math.min(255,b[k+c]+target[f][c]-src[f][c]));}
  layer.g.putImageData(layer.data,0,0);images[name]=layer.canvas;
  paletteReport[name]={head:sample(layer.data,.43,.30),suit:sample(layer.data,.59,.82),white:sample(layer.data,.39,.66),...colors(layer.data)};
 }
}

async function loadImages(){
 const names=['idle','talk','blink','scratch','smoke','body','refSad','refAnger','refJoy'];
 await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[name]=image;resolve();};image.onerror=()=>reject(Error('キャラ画像を読み込めません: '+name));image.src=name.startsWith('ref')?'assets/reference-'+({refSad:'sadness',refAnger:'anger',refJoy:'joy'}[name])+'.jpg?v=1':'assets/'+name+'.png?v=4';})));
 normalizeMotionPalette();window.prepareBatEmotions(images);imagesReady=true;if(dock)for(const c of document.querySelectorAll('[data-face-thumb]'))window.paintBatEmotionThumbnail(c,c.dataset.faceThumb);
}
function guard(fn){return (...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>setNotice(e.message));}
if(dock){
 for(const tab of document.querySelectorAll('[data-tab]'))tab.onclick=()=>{for(const b of document.querySelectorAll('[data-tab]')){const selected=b===tab;b.setAttribute('aria-selected',String(selected));document.getElementById('panel-'+b.dataset.tab).hidden=!selected;}};
 document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.altKey||e.metaKey)return;if(e.repeat)return;const expressions={q:'joy',w:'anger',e:'sadness',r:'delight',n:'normal'};if(expressions[e.key.toLowerCase()]){e.preventDefault();chooseExpression(expressions[e.key.toLowerCase()]).catch(error=>setNotice(error.message));return;}const names={'1':'scratch','2':'smoke','3':'fart','0':'normal'};if(names[e.key]){e.preventDefault();triggerGesture(names[e.key]);sendEvent({kind:'gesture',gesture:names[e.key]}).catch(()=>{});}});
 for(const key of ['scale','posX','posY','sfxVolume']){$(key).oninput=()=>{cfg[key]=Number($(key).value);applySettings(cfg);queueLiveSettings();clearTimeout(persistTimer);persistTimer=setTimeout(()=>persistSettings().catch(e=>setNotice(e.message)),400);};$(key).onchange=guard(save);}
 $('angerMarkSize').oninput=()=>{cfg.angerMarkScale=Number($('angerMarkSize').value)/100;applySettings(cfg);queueLiveSettings();clearTimeout(persistTimer);persistTimer=setTimeout(()=>persistSettings().catch(e=>setNotice(e.message)),400);};$('angerMarkSize').onchange=guard(save);
 for(const button of document.querySelectorAll('[data-expression]'))button.onclick=guard(()=>chooseExpression(button.dataset.expression));
 for(const input of document.querySelectorAll('[data-auto-motion]'))input.onchange=guard(async()=>{cfg.autoMotions=[...document.querySelectorAll('[data-auto-motion]')].filter(el=>el.checked).map(el=>el.dataset.autoMotion);await save();});
 $('autoInterval').onchange=guard(async()=>{cfg.autoInterval=Number($('autoInterval').value);await save();});
 $('resetLayout').onclick=guard(async()=>{cfg.scale=100;cfg.posX=0;cfg.posY=0;await save();});
 $('mic').onchange=guard(async()=>{cfg.mic=$('mic').value;await save();});
 $('refresh').onclick=guard(refreshInputs);
 $('device').onchange=guard(async()=>{await request('SetInputSettings',{inputName:cfg.mic,inputSettings:{device_id:$('device').value},overlay:true});setNotice('マイク機器を切り替えました。');});
 $('threshold').oninput=()=>{cfg.threshold=Number($('threshold').value);applySettings(cfg);};
 $('threshold').onchange=guard(save);
 for(const key of ['auto','kotatsu','background'])$(key).onchange=guard(async()=>{cfg[key]=$(key).checked;await save();});
 for(const button of document.querySelectorAll('[data-gesture]'))button.onclick=guard(async()=>{triggerGesture(button.dataset.gesture);await sendEvent({kind:'gesture',gesture:button.dataset.gesture});});
 $('test').onclick=guard(async()=>{testUntil=performance.now()+4500;await sendEvent({kind:'test'});setNotice('4秒間の口パクテスト。実際のマイク入力とは別です。');});
 $('calibrate').onclick=guard(async()=>{if(!cfg.mic)throw Error('先にマイクを選んでください。');calibration=[];setNotice('1秒間、周りの音量を測っています。');await new Promise(r=>setTimeout(r,1100));const samples=calibration;calibration=null;if(!samples.length)throw Error('マイクの音量を受信できません。OBSのマイクを確認してください。');samples.sort((a,b)=>a-b);cfg.threshold=Math.max(-55,Math.min(-20,Math.round(samples[Math.floor(samples.length*.9)]+10)));await save();setNotice('調整しました。話し声で口が動くか確認してください。');});
 $('addMic').onclick=guard(async()=>{const list=await request('GetInputList');if(list.inputs.some(i=>i.inputName==='キャラ用マイク'))cfg.mic='キャラ用マイク';else{const scene=await request('GetCurrentProgramScene');await request('CreateInput',{sceneName:scene.currentProgramSceneName,inputName:'キャラ用マイク',inputKind:'wasapi_input_capture',inputSettings:{device_id:'default',use_device_timing:false},sceneItemEnabled:true});cfg.mic='キャラ用マイク';}await refreshInputs();await save();});
 $('connect').onclick=()=>{port=Math.max(1,Math.min(65535,Number($('port').value)||4455));password=$('password').value;connect();};
 $('installOBS').onclick=guard(async()=>{await installOBS();await refreshInputs();await save();});
 const copyURL=async file=>{if(!ready)throw Error('先にこのPCのOBSへ接続してください。');const u=new URL(file,location.href);u.searchParams.set('rev','5');u.hash=new URLSearchParams({p:password,port:String(port)}).toString();await navigator.clipboard.writeText(u.href);setNotice('このPC用の設定URLをコピーしました。OBSへ貼り付けてください。');};
 $('copyOverlay').onclick=guard(()=>copyURL('overlay.html'));$('copyDock').onclick=guard(()=>copyURL('index.html'));
}
loadImages().catch(e=>{lastError=e.message;setNotice(e.message);});
connect();requestAnimationFrame(frame);
window.batAvatarDiagnostics=()=>({ready,imagesReady,mic:cfg.mic,threshold:cfg.threshold,db,muted,speaking,gesture,error:lastError,mode});
})();
