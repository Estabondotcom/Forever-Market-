import type {CollectorData,HistoryData} from './types';
export const HOUR=3600000;
export const RETENTION=30*86400000;
export const MIN_RETRY=60000;
export function validHistories(histories:Record<number,HistoryData>,ids:number[],range:string,now=Date.now()){
 const allowed=new Set(ids);
 return Object.fromEntries(Object.entries(histories).filter(([id,h])=>allowed.has(Number(id))&&h.range===range&&Date.parse(h.expiresAt)>now));
}
/** Expiration removes only provider data; it never triggers a shared dashboard reset. */
export function historyDeadline(histories:Record<number,HistoryData>){return Math.min(...Object.values(histories).map(h=>Date.parse(h.expiresAt)).filter(Number.isFinite));}
export function pruneCollector(data:CollectorData,now=Date.now()):CollectorData{
 const samples=data.samples.filter(s=>Date.parse(s.timestamp)-(s.intervalHours??0)*HOUR+RETENTION>now);
 const lastObservation=data.lastObservation&&Date.parse(data.lastObservation)+RETENTION>now?data.lastObservation:null;
 const stale=!lastObservation||now-Date.parse(lastObservation)>2*HOUR;
 if(samples.length===data.samples.length&&lastObservation===data.lastObservation&&stale===data.stale)return data;
 return {...data,samples,lastObservation,stale};
}
export function collectorDeadline(data:CollectorData){return Math.min(...data.samples.map(s=>Date.parse(s.timestamp)-(s.intervalHours??0)*HOUR+RETENTION),data.lastObservation?Date.parse(data.lastObservation)+RETENTION:Infinity);}

/** Leave room for the provider timeout; very short-lived responses get no fast retry loop. */
export function renewalDelay(lifetime:number){if(!Number.isFinite(lifetime)||lifetime<=15000)return MIN_RETRY;return lifetime>60000?lifetime-30000:lifetime-Math.min(5000,lifetime/4);}
