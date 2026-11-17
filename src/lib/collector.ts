import 'server-only';
import {readFile,stat} from 'node:fs/promises';
import {z} from 'zod';
import {MARKET,type CollectorData} from './types';
const sample=z.object({itemId:z.number().int().positive(),timestamp:z.iso.datetime(),minBuyout:z.number().int().nonnegative().nullable(),quantity:z.number().int().nonnegative(),estimatedTurnoverPerHour:z.number().nonnegative().nullable(),intervalHours:z.number().min(.25).max(2).nullable()});
const schema=z.object({version:z.literal(1),market:z.literal(MARKET),houseId:z.literal(114),status:z.string(),lastCheck:z.iso.datetime().nullable(),nextCheck:z.iso.datetime().nullable(),baseline:z.object({observedAt:z.iso.datetime()}).nullable(),samples:z.array(sample).max(250000)});
export async function readCollector(ids:number[],now=Date.now()):Promise<CollectorData>{
 const empty:CollectorData={enabled:false,status:'not-started',market:MARKET,houseId:114,lastCheck:null,nextCheck:null,lastObservation:null,stale:true,samples:[]};
 const path=process.env.BLIZZARD_HISTORY_PATH;if(!path)return empty;
 try{
  if((await stat(path)).size>100*1024*1024)throw new Error('Collector file too large');
  const state=schema.parse(JSON.parse(await readFile(path,'utf8'))),allowed=new Set(ids),cutoff=now-30*86400000;
  const observed=state.baseline?.observedAt??null;
  return {...empty,enabled:true,status:state.status,lastCheck:state.lastCheck,nextCheck:state.nextCheck,lastObservation:observed&&Date.parse(observed)>cutoff?observed:null,stale:!observed||now-Date.parse(observed)>7200000,samples:state.samples.filter(s=>allowed.has(s.itemId)&&Date.parse(s.timestamp)-(s.intervalHours??0)*3600000>cutoff&&Date.parse(s.timestamp)<=now+300000)};
 }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return empty;return {...empty,enabled:true,status:'history-unavailable'};}
}
