'use strict';
(async()=>{
 const $=id=>document.getElementById(id),id=crypto.randomUUID();let prepared=false,state='off',running=false,generation=0,activeSession='',stream=null,audioContext=null,processor=null,api=null,abort=null,timer=null,sessionStarted=0;
 const status=(next,message)=>{state=next;$('helperStatus').textContent=message;bus.send({kind:'engine-status',sender:id,state,prepared,message,started:sessionStarted}).catch(()=>{});};
 const bus=new BatVoice.Bus(event=>{if(event.kind==='command'&&event.target===id){if(event.action==='start')start();if(event.action==='stop')stop('OFF');if(event.action==='interrupt')interrupt();if(event.action==='text')ask(event.text);if(event.action==='depth')applyDepth(event.depth);}},()=>status(state,prepared?'マイク準備済み。OBSドックからONにできます。':'マイク準備待ち'));
 setInterval(()=>{if(running&&!bus.ready)stop('OBS接続が切れたため停止');if(bus.ready)bus.send({kind:'engine-status',sender:id,state,prepared,message:$('helperStatus').textContent,started:sessionStarted}).catch(()=>{});},2000);
 function bytes64(buffer){let text='';for(const n of new Uint8Array(buffer))text+=String.fromCharCode(n);return btoa(text);}
 async function resetPlayback(){await bus.send({kind:'audio-reset',session:activeSession,sender:id}).catch(()=>{});}
 function cleanup(){clearTimeout(timer);abort?.abort();abort=null;processor?.disconnect();processor=null;stream?.getTracks().forEach(t=>t.stop());stream=null;audioContext?.close().catch(()=>{});audioContext=null;if(api){api.onclose=null;api.onerror=null;api.close();api=null;}}
 function stop(message='OFF'){generation++;running=false;cleanup();resetPlayback();sessionStarted=0;status('off',message);}
 function fail(message){stop(message);status('error',message);}
 function interrupt(){if(api?.readyState===1){api.send(JSON.stringify({type:'response.cancel'}));api.send(JSON.stringify({type:'input_audio_buffer.clear'}));}resetPlayback();}
 function applyDepth(name){const depth=BatVoicePolicy.depths[name]||BatVoicePolicy.depths.medium;if(api?.readyState===1)api.send(JSON.stringify({type:'session.update',session:{type:'realtime',instructions:BatVoicePolicy.instructions+'\n'+depth.instructions,max_output_tokens:depth.tokens}}));}
 function ask(text){text=String(text||'').trim().slice(0,1500);if(!text||api?.readyState!==1)return;status('thinking','考えています');api.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text}]}}));api.send(JSON.stringify({type:'response.create'}));}
 async function prepare(){
  try{const permission=await navigator.mediaDevices.getUserMedia({audio:true});permission.getTracks().forEach(t=>t.stop());const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput');
   $('helperMic').replaceChildren(...devices.map(d=>{const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'マイク';return o;}));
   const wanted=devices.find(d=>/Comica.*EJoy|EJoy.*D10/i.test(d.label))||devices.find(d=>d.deviceId===localStorage.getItem('bat-voice-mic'));if(wanted)$('helperMic').value=wanted.deviceId;
   prepared=true;status('off','マイク準備済み。OBSドックのAIをONにしてください。');
  }catch(e){status('error',e.name==='NotAllowedError'?'マイクの許可が必要です。Chromeで許可してください。':'マイクを確認してください。');}
 }
 async function start(){
  if(running||state==='connecting')return;if(!prepared)return status('error','Chromeの準備画面でマイクを準備してください。');
  const myGeneration=++generation;activeSession=crypto.randomUUID();status('connecting','接続中。初回はサーバー起動に約1分かかる場合があります。');
  try{
   const cfg=await bus.config();if(!cfg.endpoint||!cfg.accessToken)throw Error('接続先の設定待ちです。');
   const endpoint=new URL(cfg.endpoint);if(endpoint.protocol!=='https:')throw Error('接続先にはHTTPSが必要です。');
   abort=new AbortController();const wait=setTimeout(()=>abort?.abort(),80000);
   let response;try{response=await fetch(endpoint.origin+'/token',{method:'POST',headers:{Authorization:'Bearer '+cfg.accessToken,'Content-Type':'application/json'},body:JSON.stringify({voice:cfg.voice||'coral',depth:cfg.depth||'medium'}),signal:abort.signal,cache:'no-store'});}finally{clearTimeout(wait);}
   if(!response.ok){const info=await response.json().catch(()=>({}));if(info.error==='billing_not_confirmed')throw Error('前払いと利用上限の設定確認待ちです。');const codes={401:'接続コードを確認してください。',429:'APIの残高または利用制限を確認してください。',503:'サーバーのAPIキー設定待ちです。'};throw Error(codes[response.status]||'音声サーバーに接続できません。');}
   const token=await response.json();if(typeof token.value!=='string'||!token.value.startsWith('ek_'))throw Error('音声接続を開始できません。');
   if(myGeneration!==generation)return;
   const socket=new WebSocket('wss://api.openai.com/v1/realtime?model='+encodeURIComponent(BatVoice.MODEL),['realtime','openai-insecure-api-key.'+token.value]);api=socket;
   await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('AI接続がタイムアウトしました。')),15000);socket.onopen=()=>{clearTimeout(timeout);resolve();};socket.onerror=()=>{clearTimeout(timeout);reject(Error('AI接続に失敗しました。'));};});
   if(myGeneration!==generation){socket.close();return;}
   socket.onmessage=e=>{let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.type==='response.output_audio.delta'||m.type==='response.audio.delta'){bus.send({kind:'audio',sender:id,session:activeSession,pcm:m.delta}).catch(()=>stop('OBS接続が切れたため停止'));if(state!=='speaking')status('speaking','AIが話しています');}
    if(m.type==='input_audio_buffer.speech_started'){resetPlayback();status('question','聞いています');}
    if(m.type==='input_audio_buffer.speech_stopped')status('thinking','考えています');
    if(m.type==='response.done')status('listening','話しかけてください');
    if(m.type==='response.output_audio_transcript.delta'||m.type==='response.audio_transcript.delta')$('helperReply').textContent=($('helperReply').textContent+m.delta).slice(-2000);
    if(m.type==='error'&&m.error?.code!=='response_cancel_not_active')fail('AI接続エラー。残高・API設定を確認してください。');
   };
   socket.onerror=()=>fail('AIとの接続が切れました。');socket.onclose=()=>{if(running)stop('AIとの接続が終了しました。');};
   const device=$('helperMic').value;localStorage.setItem('bat-voice-mic',device);
   const mic=await navigator.mediaDevices.getUserMedia({audio:{deviceId:device?{exact:device}:undefined,channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(myGeneration!==generation){mic.getTracks().forEach(t=>t.stop());return;}stream=mic;
   audioContext=new AudioContext();await audioContext.audioWorklet.addModule('voice-capture-worklet.js?v=1');await audioContext.resume();
   if(myGeneration!==generation)return;
   const source=audioContext.createMediaStreamSource(stream);processor=new AudioWorkletNode(audioContext,'bat-mic',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});const silent=audioContext.createGain();silent.gain.value=0;source.connect(processor).connect(silent).connect(audioContext.destination);
   processor.port.onmessage=e=>{if(socket.readyState!==1||!running)return;if(socket.bufferedAmount>262144)return fail('音声接続が遅延したため停止しました。');const pcm=new Int16Array(e.data);let power=0;for(const x of pcm)power+=(x/32768)**2;bus.send({kind:'input-level',sender:id,session:activeSession,level:Math.min(1,Math.sqrt(power/pcm.length)*5)}).catch(()=>{});socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:bytes64(e.data)}));};
   running=true;sessionStarted=Date.now();timer=setTimeout(()=>stop('15分経過したため自動OFF'),15*60000);$('helperReply').textContent='';await resetPlayback();status('listening','話しかけてください');
  }catch(e){if(myGeneration!==generation)return;fail(e.name==='NotAllowedError'?'マイクの許可が必要です。':e.name==='AbortError'?'接続がタイムアウトしました。':e.message);}
 }
 $('prepareMic').onclick=prepare;$('helperStop').onclick=()=>stop();window.addEventListener('pagehide',()=>stop('ブラウザ終了'));status('off','Chromeでマイクを準備し、この画面を開いたままにしてください。');
})();