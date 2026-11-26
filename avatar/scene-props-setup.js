'use strict';
window.installBatPropScene=async function(request,{sceneName,password,port,config,baseURL}){
 const manifest=window.BAT_PROP_MANIFEST,first=!config.roomSeparate,order=['room','figure','kotatsu','shochu','ashtray','mikan-platter','atsukan'],created=[];
 if(first)Object.assign(config,{scale:50,posX:-598,posY:120,angerMarkScale:2.4});
 Object.assign(config,{roomSeparate:true,kotatsu:true,figure:true});
 const inputs=(await request('GetInputList')).inputs;
 for(const key of order){const s=manifest[key];if(!s)continue;
 const url=new URL('props.html',baseURL);url.searchParams.set('asset',key);url.searchParams.set('v','2');url.hash=new URLSearchParams({p:password,port:String(port)}).toString();
 const inputSettings={url:url.href,width:s.kind==='room'?1920:s.crop.w,height:s.kind==='room'?1080:s.crop.h,fps:30,fps_custom:true,is_local_file:false,shutdown:false,restart_when_active:false,reroute_audio:false};
 const exists=inputs.some(i=>i.inputName===s.sourceName);
 if(!exists){await request('CreateInput',{sceneName,inputName:s.sourceName,inputKind:'browser_source',inputSettings,sceneItemEnabled:true});created.push(key);}
 else await request('SetInputSettings',{inputName:s.sourceName,inputSettings,overlay:true});
 let items=(await request('GetSceneItemList',{sceneName})).sceneItems,item=items.find(i=>i.sourceName===s.sourceName);
 if(!item){const r=await request('CreateSceneItem',{sceneName,sourceName:s.sourceName,sceneItemEnabled:true});item={sceneItemId:r.sceneItemId};created.push(key);}
 if(first||created.includes(key))await request('SetSceneItemTransform',{sceneName,sceneItemId:item.sceneItemId,sceneItemTransform:window.batPropTransform(s,config)});
 }
 if(first){const items=(await request('GetSceneItemList',{sceneName})).sceneItems;
 const names=[manifest.room.sourceName,manifest.figure?.sourceName,'BAT キャラ（ブラウザ）',...order.slice(2).map(k=>manifest[k]?.sourceName)].filter(Boolean);
 for(let i=0;i<names.length;i++){const item=items.find(x=>x.sourceName===names[i]);if(item)await request('SetSceneItemIndex',{sceneName,sceneItemId:item.sceneItemId,sceneItemIndex:i});}
 const avatar=items.find(x=>x.sourceName==='BAT キャラ（ブラウザ）');if(avatar)await request('SetSceneItemTransform',{sceneName,sceneItemId:avatar.sceneItemId,sceneItemTransform:{positionX:0,positionY:0,scaleX:1,scaleY:1,rotation:0,alignment:5,boundsType:'OBS_BOUNDS_NONE'}});
 }
 return {created};
};