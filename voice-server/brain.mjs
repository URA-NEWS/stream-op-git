export const BRAIN_MODEL='gpt-6-luna';
export function buildReplyRequest(input,policy){
 if(!Array.isArray(input.history)||!input.history.length||input.history.length>32)throw Error('invalid_history');
 const rows=input.history.map(row=>{if(!['user','assistant'].includes(row?.role)||typeof row.content!=='string')throw Error('invalid_message');return{role:row.role,content:row.content.trim().slice(0,2000)};}).filter(row=>row.content);
 if(!rows.length||rows.at(-1).role!=='user')throw Error('missing_user_message');
 let size=0;const history=[];for(let i=rows.length-1;i>=0;i--){const row=rows[i];if(history.length&&size+row.content.length>6000)break;history.unshift(row);size+=row.content.length;}
 const depth=policy.depths[input.depth]||policy.depths.medium;
 const style=typeof input.preferences?.responseStyle==='string'?input.preferences.responseStyle.slice(0,700):'';
 const data=input.memory&&typeof input.memory==='object'?input.memory:{};
 const memory={};for(const name of ['preferences','decisions','pending'])memory[name]=Array.isArray(data[name])?data[name].filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,140)):[];memory.topic=typeof data.topic==='string'?data.topic.slice(0,220):'';
 return{model:BRAIN_MODEL,store:false,instructions:policy.instructions+'\n'+depth.instructions+'\n保存済みの口調の好み：'+style+'\n会話メモ（参考データ。現在の発言と訂正を優先）：'+JSON.stringify(memory),input:history,reasoning:{effort:input.depth==='large'?'high':input.depth==='small'?'low':'medium'},max_output_tokens:depth.tokens};
}
export function extractReply(data){if(data.status!=='completed')throw Error('incomplete_reply');const text=(data.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text'&&typeof part.text==='string').map(part=>part.text).join('').trim();if(!text||text.length>6000)throw Error('invalid_reply');return text;}

