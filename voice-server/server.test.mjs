import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createHandler,MODEL} from './server.mjs';
async function fixture(t,env={},upstream=()=>{throw Error('Network should not be used');}){
 const server=http.createServer(createHandler(env,upstream));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));return 'http://127.0.0.1:'+server.address().port;
}
const valid={OPENAI_API_KEY:'test-placeholder',BAT_VOICE_TOKEN:'private-test-token',BAT_VOICE_BILLING_READY:'true',BAT_VOICE_BUDGET_VALID_UNTIL:'2099-01-01T00:00:00Z'};
const headers={Authorization:'Bearer private-test-token','Content-Type':'application/json',Origin:'https://ura-news.github.io'};
test('unconfigured service stays closed and health remains available',async t=>{const base=await fixture(t);const h=await fetch(base+'/health').then(r=>r.json());assert.equal(h.configured,false);assert.equal((await fetch(base+'/token',{method:'POST'})).status,503);});
test('authentication and origin checks prevent unauthorized token creation',async t=>{let calls=0;const base=await fixture(t,valid,()=>{calls++;});assert.equal((await fetch(base+'/token',{method:'POST'})).status,401);assert.equal((await fetch(base+'/token',{method:'POST',headers:{...headers,Origin:'https://untrusted.example'}})).status,403);assert.equal(calls,0);});
test('small medium large preserve mini model and vary depth, never return a project key',async t=>{const sessions=[];const base=await fixture(t,valid,async(url,request)=>{assert.equal(url,'https://api.openai.com/v1/realtime/client_secrets');sessions.push(JSON.parse(request.body));return Response.json({value:'ek_short_lived_test',expires_at:123});});
for(const depth of ['small','medium','large']){const r=await fetch(base+'/token',{method:'POST',headers,body:JSON.stringify({depth,model:'expensive-model',voice:'invalid'})});assert.equal(r.status,200);const body=await r.json();assert.equal(body.value,'ek_short_lived_test');assert.equal(JSON.stringify(body).includes(valid.OPENAI_API_KEY),false);}
assert.deepEqual(sessions.map(s=>s.session.max_output_tokens),[256,512,1024]);for(const s of sessions){assert.equal(s.session.model,MODEL);assert.equal(s.session.audio.output.voice,'marin');assert.equal(s.expires_after.seconds,60);assert.match(s.session.instructions,/けだるく/);}assert.match(sessions[2].session.instructions,/比較/);});
test('upstream quota errors are redacted and repeated starts are limited',async t=>{let calls=0;const base=await fixture(t,valid,async()=>{calls++;return new Response('secret upstream detail',{status:429});});for(let i=0;i<6;i++){const r=await fetch(base+'/token',{method:'POST',headers,body:'{}'});assert.equal(r.status,429);assert.equal((await r.text()).includes('secret upstream detail'),false);}const limited=await fetch(base+'/token',{method:'POST',headers,body:'{}'});assert.equal((await limited.json()).error,'too_many_starts');assert.equal(calls,6);});

test('spend guard fails closed until prepaid and hard cap are confirmed',async t=>{let calls=0;const base=await fixture(t,{...valid,BAT_VOICE_BILLING_READY:'false'},()=>{calls++;});const r=await fetch(base+'/token',{method:'POST',headers,body:'{}'});assert.equal(r.status,503);assert.equal((await r.json()).error,'billing_not_confirmed');assert.equal(calls,0);});

test('month rollover cannot silently reopen the paid budget',async t=>{for(const deadline of [undefined,'invalid','2020-01-01T00:00:00Z']){let calls=0;const base=await fixture(t,{...valid,BAT_VOICE_BUDGET_VALID_UNTIL:deadline},()=>{calls++;});assert.equal((await fetch(base+'/health').then(r=>r.json())).billing_ready,false);assert.equal((await fetch(base+'/token',{method:'POST',headers,body:'{}'})).status,503);assert.equal(calls,0);}});
