'use strict';
(()=>{
 const $=id=>document.getElementById(id);let cfg={endpoint:'',accessToken:'',voice:'coral',depth:'medium',volume:55},engine=null,lastEngine=0,engineState='off',prepared=false,bridgeReady=false;
 const request=(...a)=>window.batVoiceOBS.request(...a),send=d=>request('BroadcastCustomEvent',{eventData:{system:'bat-voice-v1',...d}}),notice=t=>$('aiStatus').textContent=t;
 function form(){ $('aiEndpoint').value=cfg.endpoint||'';$('aiAccess').value=cfg.accessToken||'';$('aiVoice').value=cfg.voice||'coral';$('aiVolume').value=cfg.volume;$('aiVolumeValue').textContent=cfg.volume+'%';for(const b of document.querySelectorAll('[data-ai-depth]'))b.setAttribute('aria-pressed',String(b.dataset.aiDepth===cfg.depth));}
 async function load(){try{const r=await request('GetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:'bat-voice-config-v1'});cfg={...cfg,...r.slotValue};form();notice(cfg.endpoint&&cfg.accessToken?'マイク準備画面を開いてください。':'接続サーバー・APIキーの設定待ちです。');}catch{notice('OBSへの接続待ちです。');}}
 async function save(){await request('SetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:'bat-voice-config-v1',slotValue:cfg});await send({kind:'config',volume:cfg.volume});}
 async function command(action,extra={}){if(!engine||Date.now()-lastEngine>7000)throw Error('Chromeのマイク準備画面を開いてください。');await send({kind:'command',target:engine,action,...extra});}
 function guard(fn){return(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>notice(e.message));}
 window.addEventListener('bat-obs-connected',load);
 window.addEventListener('bat-voice-event',e=>{const d=e.detail;
  if(d.kind==='engine-status'){
   if(engine&&engine!==d.sender&&Date.now()-lastEngine<7000)return;engine=d.sender;lastEngine=Date.now();engineState=d.state;prepared=d.prepared;
   const active=['connecting','listening','speaking'].includes(d.state);$('aiToggle').setAttribute('aria-pressed',String(active));$('aiToggle').textContent=active?'AI ON → OFFにする':'AI OFF → ONにする';$('aiToggle').classList.toggle('ai-live',active);
   if(d.message)notice(d.message);
  }
  if(d.kind==='playback-status'){bridgeReady=d.ready;if(d.message)notice(d.message);}
 });
 setInterval(()=>{if(engine&&Date.now()-lastEngine>7000){engine=null;prepared=false;engineState='off';$('aiToggle').setAttribute('aria-pressed','false');$('aiToggle').textContent='AI OFF → ONにする';$('aiToggle').classList.remove('ai-live');notice('マイク準備画面との接続が切れました。');}},2000);
 $('aiToggle').onclick=guard(async()=>{
  if(['connecting','listening','speaking'].includes(engineState)){await command('stop');return;}
  if(!cfg.endpoint||!cfg.accessToken){$('aiSetup').open=true;throw Error('接続先とAPIキーの設定がまだ完了していません。');}
  if(!prepared)throw Error('Chromeでマイクを準備してください。');if(!bridgeReady)throw Error('OBSの「BAT AI音声」を確認してください。');
  await command('start');notice('AIに接続中…');
 });
 $('aiInterrupt').onclick=guard(()=>command('interrupt'));
 $('aiHelper').onclick=()=>{const url=new URL('voice-helper.html',location.href);url.hash=location.hash;window.open(url.href,'_blank','noopener,noreferrer');};
 for(const b of document.querySelectorAll('[data-ai-depth]'))b.onclick=guard(async()=>{cfg.depth=b.dataset.aiDepth;form();await save();if(engine)await command('depth',{depth:cfg.depth});notice('返答の深さ：'+({small:'小・短く即答',medium:'中・理由付き',large:'大・比較や注意点まで'})[cfg.depth]);});
 $('aiVolume').oninput=()=>{cfg.volume=Number($('aiVolume').value);$('aiVolumeValue').textContent=cfg.volume+'%';send({kind:'config',volume:cfg.volume}).catch(()=>{});};$('aiVolume').onchange=guard(save);
 $('aiSave').onclick=guard(async()=>{const value=$('aiEndpoint').value.trim();if(value){let u;try{u=new URL(value);}catch{throw Error('接続先URLを確認してください。');}if(u.protocol!=='https:')throw Error('HTTPSの接続先が必要です。');cfg.endpoint=u.origin;}else cfg.endpoint='';cfg.accessToken=$('aiAccess').value.trim();cfg.voice=$('aiVoice').value;await save();notice('接続設定を保存しました。');});
 $('aiAskForm').onsubmit=e=>{e.preventDefault();guard(async()=>{const text=$('aiQuestion').value.trim();if(!text)return;if(!['listening','speaking'].includes(engineState))throw Error('先にAIをONにしてください。');await command('text',{text});$('aiQuestion').value='';})();};
 form();load();
})();