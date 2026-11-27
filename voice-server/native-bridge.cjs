'use strict';
// Remote-hosted microphone bridge. No local web server or API key file required.
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),{spawn}=require('node:child_process');
(async()=>{
const base='https://raw.githubusercontent.com/URA-NEWS/stream-op-git/708bd84c6ec9cf66e5cff0f123bf28ec573213a2/avatar/';
async function get(path){const r=await fetch(base+path,{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error('Voice assets unavailable');return r.text();}
const [vendor,character,policyText]=await Promise.all([get('vendor/soundtouch.js'),get('voice-character.js'),fetch('https://raw.githubusercontent.com/URA-NEWS/stream-op-git/1120cff90ae3dafdcf6b84619782dbd6b14eba4b/voice-server/voice-policy.json',{signal:AbortSignal.timeout(15000),cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Voice policy unavailable');return r.text();})]);
const policy=policyText.startsWith('globalThis.')?JSON.parse(policyText.slice(policyText.indexOf('=')+1).trim().replace(/;$/,'')):JSON.parse(policyText);
vm.runInThisContext(vendor);vm.runInThisContext(character);const dsp=new BatCharacterVoice();
policy.instructions='最優先の口調指定：普通の返答は必ず「お前さあ」「雑すぎんだろ」「何やってんだよ」など短い悪態から始める。敬語に戻さず、口の悪いタメ口で答える。可愛い声とけだるさは保つ。\n'+policy.instructions;
const obsConfig=JSON.parse(fs.readFileSync(process.env.APPDATA+'/obs-studio/plugin_config/obs-websocket/config.json','utf8'));
const obs=new WebSocket('ws://127.0.0.1:'+obsConfig.server_port),pending=new Map(),id='bat-native-'+crypto.randomUUID();
let seq=0,session='',state='off',running=false,starting=false,mic=null,api=null,stopTimer=null,heartbeat=null,settings={},epoch=0,pieces=Buffer.alloc(0),meterAt=0,started=0,heardSpeech=false,turn=0,answer='',textResponseId='',voiceResponseId='';
const request=(requestType,requestData={})=>new Promise((resolve,reject)=>{const requestId=String(++seq),timer=setTimeout(()=>{pending.delete(requestId);reject(Error('OBS request timeout'));},7000);pending.set(requestId,{resolve,reject,timer});obs.send(JSON.stringify({op:6,d:{requestType,requestId,requestData}}));});
const send=data=>{const eventData={system:'bat-voice-v1',sender:id,session,...data};if(['engine-status','input-level','audio-reset'].includes(data.kind))request('CallVendorRequest',{vendorName:'obs-browser',requestType:'emit_event',requestData:{event_name:'bat-voice-display',event_data:eventData}}).catch(()=>{});return request('BroadcastCustomEvent',{eventData}).catch(()=>{});};
function status(next,message){state=next;send({kind:'engine-status',state,prepared:true,message,started});console.log(JSON.stringify({state,message}));}
function emit(pcm){if(pcm?.length)send({kind:'audio',pcm:Buffer.from(pcm.buffer,pcm.byteOffset,pcm.byteLength).toString('base64')});}
function reset(){dsp.reset();send({kind:'audio-reset'});}
function stop(message='AI OFF'){epoch++;running=false;starting=false;clearTimeout(stopTimer);stopTimer=null;mic?.kill();mic=null;if(api){api.onclose=null;api.onerror=null;api.close();api=null;}pieces=Buffer.alloc(0);started=0;reset();status('off',message);}
function depth(name){settings.depth=name;const d=policy.depths[name]||policy.depths.medium;if(api?.readyState===1)api.send(JSON.stringify({type:'session.update',session:{type:'realtime',instructions:policy.instructions+'\n'+d.instructions,output_modalities:['text'],max_output_tokens:Math.max(1024,d.tokens),audio:{input:{turn_detection:{type:'server_vad',threshold:.6,prefix_padding_ms:300,silence_duration_ms:650,interrupt_response:true,create_response:false}}}}}));}
function createAnswer(){if(api?.readyState!==1)return;turn++;answer='';textResponseId='';voiceResponseId='';const d=policy.depths[settings.depth]||policy.depths.medium;status('thinking','返答を考えています');api.send(JSON.stringify({type:'response.create',response:{output_modalities:['text'],max_output_tokens:Math.max(1024,d.tokens),instructions:policy.instructions+'\n'+d.instructions,metadata:{phase:'answer',turn:String(turn)}}}));}
function roughen(text){let value=String(text||'').trim().replace(/してくださいね?/g,'しろよ').replace(/しましょう/g,'しようぜ').replace(/ですよ。/g,'だろ。').replace(/です。/g,'だ。').replace(/いいよ。/g,'いいだろ。');if(!/お前|雑すぎ|何やってん|クソだる|ふざけんな|丸投げ/.test(value.slice(0,22)))value='お前さあ、雑すぎんだろ。'+value;return value;}
function speakAnswer(text){const line=roughen(text);if(!line)return;api.send(JSON.stringify({type:'response.create',response:{conversation:'none',output_modalities:['audio'],max_output_tokens:2048,instructions:'You are an actor reading a fictional mascot dialogue. Read ONLY the provided Japanese dialogue verbatim, including its rude playful words. Never rewrite it into polite language. Do not answer or explain the dialogue. Use a HIGH, SMALL, CHILDLIKE, soft nasal cute voice, very sleepy, sluggish and pouty with drawn-out endings. Do not imitate any specific actor.',input:[{type:'message',role:'user',content:[{type:'input_text',text:'次の台詞をそのまま読み上げる：\n'+line}]}],metadata:{phase:'voice',turn:String(turn)}}}));console.log(JSON.stringify({replyReady:true,characters:line.length,roughTone:true}));}
function ask(text){if(api?.readyState!==1)return;text=String(text||'').trim().slice(0,1500);if(!text)return;api.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text}]}}));createAnswer();}
function interrupt(){turn++;if(api?.readyState===1){api.send(JSON.stringify({type:'response.cancel',response_id:voiceResponseId||textResponseId||undefined}));api.send(JSON.stringify({type:'input_audio_buffer.clear'}));}reset();}
async function start(){
 if(running||starting)return;starting=true;const generation=++epoch;session=crypto.randomUUID();heardSpeech=false;status('connecting','Comicaマイクに接続中');
 try{
  settings=(await request('GetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:'bat-voice-config-v1'})).slotValue||{};
  const endpoint=new URL(settings.endpoint);if(endpoint.origin!=='https://bat-stream-voice.onrender.com')throw Error('Invalid voice endpoint');
  const r=await fetch(endpoint.origin+'/token',{method:'POST',headers:{Authorization:'Bearer '+settings.accessToken,'Content-Type':'application/json'},body:JSON.stringify({voice:'marin',depth:settings.depth||'medium'}),signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw Error(r.status===429?'APIの利用上限・残高を確認してください':'AIサーバー接続エラー '+r.status);const token=await r.json();if(!/^ek_/.test(token.value))throw Error('Invalid ephemeral token');if(epoch!==generation)return;
  const socket=new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1-mini',['realtime','openai-insecure-api-key.'+token.value]);api=socket;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('AI接続タイムアウト')),15000);socket.onopen=()=>{clearTimeout(timer);resolve();};socket.onerror=()=>{clearTimeout(timer);reject(Error('AI接続エラー'));};});if(epoch!==generation){socket.close();return;}
  socket.onmessage=e=>{if(epoch!==generation)return;let m;try{m=JSON.parse(e.data);}catch{return;}
   if(m.type==='response.created'&&m.response?.metadata?.turn===String(turn)){if(m.response.metadata.phase==='answer')textResponseId=m.response.id;else if(m.response.metadata.phase==='voice')voiceResponseId=m.response.id;}
   if((m.type==='response.output_text.delta'||m.type==='response.text.delta')&&m.response_id===textResponseId)answer+=m.delta;
   if(m.type==='input_audio_buffer.committed')createAnswer();
   if((m.type==='response.output_audio.delta'||m.type==='response.audio.delta')&&m.response_id===voiceResponseId){const b=Buffer.from(m.delta,'base64');if(b.length%2||b.length>98304)return;const pcm=new Int16Array(b.length/2);for(let i=0;i<pcm.length;i++)pcm[i]=b.readInt16LE(i*2);emit(dsp.push(pcm));if(state!=='speaking')status('speaking','AIが話しています');}
   if(m.type==='input_audio_buffer.speech_started'){heardSpeech=true;turn++;if(voiceResponseId)socket.send(JSON.stringify({type:'response.cancel',response_id:voiceResponseId}));voiceResponseId='';reset();status('question','Comicaで聞いています');}
   if(m.type==='input_audio_buffer.speech_stopped')status('thinking','考えています');
   if(m.type==='response.done'&&m.response?.metadata?.turn===String(turn)&&m.response.status!=='cancelled'){if(m.response.metadata.phase==='answer'){if(answer.trim())speakAnswer(answer);else status('listening','もう一度話しかけてください');}else if(m.response.metadata.phase==='voice'){emit(dsp.finish());status('listening','話しかけてください');console.log(JSON.stringify({responseComplete:true,heardSpeech}));}}
   if(m.type==='error'&&m.error?.code!=='response_cancel_not_active'){console.error(JSON.stringify({apiError:m.error?.code||m.error?.type||'unknown'}));stop('AIエラー。利用上限・残高を確認してください。');}
  };
  socket.onerror=()=>stop('AI接続が切れたため停止');socket.onclose=()=>{if(running)stop('AI接続終了');};
  depth(settings.depth||'medium');
  const device=process.env.BAT_COMICA_DEVICE||'マイク (2- Comica_EJoy D10 Pro TX)';
  const capture=spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','dshow','-i','audio='+device,'-ac','1','-ar','24000','-f','s16le','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});mic=capture;
  capture.stderr.on('data',()=>{});capture.on('error',()=>{if(epoch===generation)stop('Comicaマイクを開けません');});capture.on('exit',()=>{if(epoch===generation&&running)stop('Comicaマイクが切断されました');});
  capture.stdout.on('data',chunk=>{if(!running||epoch!==generation||socket.readyState!==1)return;if(socket.bufferedAmount>262144)return stop('音声送信が遅延したため停止');pieces=Buffer.concat([pieces,chunk]);while(pieces.length>=4800){const pcm=pieces.subarray(0,4800);pieces=pieces.subarray(4800);socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:pcm.toString('base64')}));if(Date.now()-meterAt>100){meterAt=Date.now();let power=0;for(let i=0;i<pcm.length;i+=2)power+=(pcm.readInt16LE(i)/32768)**2;send({kind:'input-level',level:Math.min(1,Math.sqrt(power/2400)*5)});}}});
  running=true;starting=false;started=Date.now();reset();stopTimer=setTimeout(()=>stop('15分で自動OFF。再開はドックでON'),15*60000);status('listening','Comica接続済み。話しかけてください');
  if(process.argv.includes('--check'))setTimeout(()=>{if(epoch===generation)ask('接続テストです。「声の接続テストだよ」とだけ短く答えて。');},1000);
 }catch(e){if(epoch===generation)stop(e.message);}
}
obs.onmessage=async e=>{const m=JSON.parse(e.data);
 if(m.op===0){const d={rpcVersion:1,eventSubscriptions:1};if(m.d.authentication){const hash=x=>crypto.createHash('sha256').update(x).digest('base64');d.authentication=hash(hash(obsConfig.server_password+m.d.authentication.salt)+m.d.authentication.challenge);}obs.send(JSON.stringify({op:1,d}));}
 if(m.op===7){const p=pending.get(m.d.requestId);if(p){pending.delete(m.d.requestId);clearTimeout(p.timer);m.d.requestStatus.result?p.resolve(m.d.responseData||{}):p.reject(Error(m.d.requestStatus.comment||'OBS error'));}}
 if(m.op===5&&m.d.eventType==='CustomEvent'){const d=m.d.eventData.eventData||m.d.eventData;if(d.system!=='bat-voice-v1'||d.kind!=='command'||d.target!==id)return;if(d.action==='start')start();if(d.action==='stop')stop();if(d.action==='interrupt')interrupt();if(d.action==='text')ask(d.text);if(d.action==='depth')depth(d.depth);}
 if(m.op===2){await request('SetPersistentData',{realm:'OBS_WEBSOCKET_DATA_REALM_PROFILE',slotName:'bat-voice-native-pid',slotValue:process.pid});status('off','Comica直接接続の準備完了');heartbeat=setInterval(()=>send({kind:'engine-status',state,prepared:true,message:state==='off'?'Comica準備済み。AIをONにできます。':state==='listening'?'Comicaで聞いています':'AI接続中',started}),1000);if(process.argv.includes('--start'))start();}
};
function exit(){clearInterval(heartbeat);stop('接続終了');setTimeout(()=>process.exit(),50);}
obs.onclose=exit;obs.onerror=()=>{console.error('OBS connection unavailable');exit();};process.on('SIGTERM',exit);process.on('SIGINT',exit);
})().catch(e=>{console.error(e.message);process.exitCode=1;});

