import {readFile} from 'node:fs/promises';
import {loadState,saveState} from './store.mjs';
import {advance,normalizeSnapshot} from './model.mjs';
import {fetchSnapshot} from './transport.mjs';
const directory=process.env.BLIZZARD_DATA_DIR??'/app/market-data';
const items=JSON.parse(await readFile(new URL('../src/data/resources.json',import.meta.url),'utf8')).map(i=>i.id);
let state;
try{state=await loadState(directory);}catch(error){console.error(error.message);process.exit(1);}
let stopped=false,wake;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopped=true;wake?.();});
const enabled=process.env.BLIZZARD_COLLECTOR_ENABLED==='true'&&process.env.BLIZZARD_HOUSE_ID==='114';
if(!enabled){console.error('Set BLIZZARD_COLLECTOR_ENABLED=true and BLIZZARD_HOUSE_ID=114 to opt into the community-mapped US Normal Horde collector.');process.exit(1);}
console.log('Blizzard commodity collector: US Forever Normal Horde, community-mapped house 114. Estimated turnover, not confirmed sales.');
while(!stopped){
  let delay=3600000;
  const nextDue=Date.parse(state.nextCheck??'');
  if(Number.isFinite(nextDue)&&nextDue>Date.now())delay=Math.min(nextDue-Date.now(),3600000);
  else{
    state.lastCheck=new Date().toISOString();
    try{
      const result=await fetchSnapshot({clientId:process.env.BLIZZARD_CLIENT_ID,clientSecret:process.env.BLIZZARD_CLIENT_SECRET,baseline:state.baseline,etag:state.etag});
      if(result.unchanged)state.status='unchanged';
      else{advance(state,normalizeSnapshot(result.data,result.lastModified,items));state.etag=result.etag;state.cacheControl=result.cacheControl;}
      console.log(`Collector ${state.status}; observation ${state.baseline?.observedAt??'none'}.`);
    }catch(error){state.status=/^http-\d+$/.test(error.message)?error.message:'collection-error';delay=Math.max(delay,error.retryMs??0);console.error(`Collector ${state.status}; existing history preserved, no zero-filled observations.`);}
    state.nextCheck=new Date(Date.now()+delay).toISOString();
  }
  await saveState(directory,state);
  await new Promise(resolve=>{const timer=setTimeout(resolve,Math.min(delay,3600000));wake=()=>{clearTimeout(timer);resolve();};});wake=undefined;
}
