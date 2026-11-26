import http from 'node:http';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const policy=JSON.parse(readFileSync(new URL('./voice-policy.json',import.meta.url),'utf8'));
import {createHash,timingSafeEqual} from 'node:crypto';
export const MODEL='gpt-realtime-2.1-mini';
export const INSTRUCTIONS=policy.instructions;
const ALLOWED_ORIGIN='https://ura-news.github.io';
function matches(a,b){const h=x=>createHash('sha256').update(x).digest();return timingSafeEqual(h(a),h(b));}
export function createHandler(env=process.env,upstream=fetch){
 const limits=new Map();
 const billingReady=()=>env.BAT_VOICE_BILLING_READY==='true'&&Number.isFinite(Date.parse(env.BAT_VOICE_BUDGET_VALID_UNTIL))&&Date.now()<Date.parse(env.BAT_VOICE_BUDGET_VALID_UNTIL);
 return async(req,res)=>{
  const origin=req.headers.origin;
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===ALLOWED_ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
  const send=(status,body)=>{res.writeHead(status,headers);res.end(JSON.stringify(body));};
  if(origin&&origin!==ALLOWED_ORIGIN)return send(403,{error:'origin_not_allowed'});
  if(req.method==='OPTIONS'){res.writeHead(204,headers);return res.end();}
  if(req.url==='/health'&&req.method==='GET')return send(200,{ok:true,model:MODEL,configured:Boolean(env.OPENAI_API_KEY&&env.BAT_VOICE_TOKEN),billing_ready:billingReady(),budget_usd:5});
  if(req.url!=='/token'||req.method!=='POST')return send(404,{error:'not_found'});
  if(!env.OPENAI_API_KEY||!env.BAT_VOICE_TOKEN)return send(503,{error:'voice_not_configured'});
  if(!billingReady())return send(503,{error:'billing_not_confirmed'});
  const authorization=req.headers.authorization||'';
  if(!matches(authorization,'Bearer '+env.BAT_VOICE_TOKEN))return send(401,{error:'unauthorized'});
  const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0],now=Date.now(),previous=limits.get(key);
  if(previous&&now-previous.time<60000&&previous.count>=6)return send(429,{error:'too_many_starts'});
  limits.set(key,previous&&now-previous.time<60000?{time:previous.time,count:previous.count+1}:{time:now,count:1});
  if(limits.size>500)for(const[k,v]of limits)if(now-v.time>60000)limits.delete(k);
  try{
   let size=0,body='';
   for await(const part of req){size+=part.length;if(size>4096)return send(413,{error:'request_too_large'});body+=part;}
   let input;try{input=JSON.parse(body||'{}');}catch{return send(400,{error:'invalid_json'});}
   const voice=policy.voice;const depth=policy.depths[input.depth]||policy.depths.medium;
   const result=await upstream('https://api.openai.com/v1/realtime/client_secrets',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json','OpenAI-Safety-Identifier':'bat-stream-voice'},signal:AbortSignal.timeout(20000),body:JSON.stringify({expires_after:{anchor:'created_at',seconds:60},session:{type:'realtime',model:MODEL,output_modalities:['audio'],instructions:INSTRUCTIONS+'\n'+depth.instructions,max_output_tokens:depth.tokens,audio:{input:{format:{type:'audio/pcm',rate:24000},noise_reduction:{type:'near_field'},turn_detection:{type:'server_vad',threshold:.6,prefix_padding_ms:300,silence_duration_ms:650,interrupt_response:true,create_response:true}},output:{format:{type:'audio/pcm',rate:24000},voice,speed:policy.speed}}}})});
   if(!result.ok)return send(result.status===429?429:502,{error:result.status===429?'openai_quota_or_rate_limit':'openai_rejected',upstream_status:result.status});
   const data=await result.json();
   if(typeof data.value!=='string'||!data.value.startsWith('ek_'))return send(502,{error:'invalid_upstream_response'});
   return send(200,{value:data.value,expires_at:data.expires_at,model:MODEL});
  }catch{return send(502,{error:'connection_failed'});}
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 http.createServer(createHandler()).listen(Number(process.env.PORT)||10000,'0.0.0.0',()=>console.log('BAT voice token service is ready'));
}
