import type {CatalogItem,CollectorData,HistoryData,PriceHistoryPoint} from './types';
/** Local Blizzard history is independent of AHledger response retention and credentials. */
export function collectedHistories(items:CatalogItem[],histories:Record<number,HistoryData>,collector:CollectorData|null,range:string,now=Date.now(),preferLocalPrice=false){
 if(!collector?.enabled)return histories;
 const result={...histories},cutoff=now-(range==='30d'?30:range==='24h'?1:7)*86400000;
 for(const item of items){
  const samples=collector.samples.filter(s=>s.itemId===item.id&&Date.parse(s.timestamp)>cutoff&&Date.parse(s.timestamp)<=now);
  const existing=histories[item.id],useProvider=!preferLocalPrice&&!!existing?.series.length;
  const local:PriceHistoryPoint[]=samples.map(s=>({timestamp:s.timestamp,minBuyout:useProvider?null:s.minBuyout,median:null,quantity:s.quantity,estimatedTurnoverPerHour:s.estimatedTurnoverPerHour,intervalHours:s.intervalHours}));
  result[item.id]={...(useProvider?existing:{itemId:item.id,range,latest:null,sales:null,expiresAt:new Date(now+3600000).toISOString()}),priceSource:useProvider?'ahledger':'blizzard-local',turnoverSource:true,series:[...(useProvider?existing.series.map(p=>({...p,estimatedSalesPerDay:undefined})):[]),...local]};
 }
 return result;
}

/** Row values use the same independently retained Blizzard snapshots as the local graph. */
export function collectedMarket(items:CatalogItem[],collector:CollectorData|null,now=Date.now()){
 if(!collector?.enabled)return null;
 const allowed=new Set(items.map(i=>i.id)),latest=new Map<number,typeof collector.samples[number]>();
 for(const sample of collector.samples){
  if(!allowed.has(sample.itemId)||Date.parse(sample.timestamp)>now||Date.parse(sample.timestamp)-(sample.intervalHours??0)*3600000<=now-30*86400000)continue;
  if(!latest.has(sample.itemId)||Date.parse(sample.timestamp)>Date.parse(latest.get(sample.itemId)!.timestamp))latest.set(sample.itemId,sample);
 }
 if(!latest.size)return null;
 return {market:{market:'forever.normal.horde.us' as const,snapshots:[...latest.values()].map(s=>({itemId:s.itemId,minBuyout:s.minBuyout,median:null,median7d:null,median30d:null,quantity:s.quantity,auctions:null,observedAt:s.timestamp,sales:{estimatedPerDay:null},source:'Blizzard · locally collected commodities',url:'https://develop.battle.net/'})),fetchedAt:collector.lastCheck??new Date(now).toISOString(),expiresAt:new Date(Math.min(...[...latest.values()].map(s=>Date.parse(s.timestamp)-(s.intervalHours??0)*3600000+30*86400000))).toISOString(),stale:collector.stale,historyRanges:['7d','30d']},demand:new Map([...latest].map(([id,s])=>[id,s.estimatedTurnoverPerHour]))};
}

/** Diagnostics count actual saved intervals, including measured zero, never rolling estimates. */
export function demandCoverage(items:CatalogItem[],collector:CollectorData|null,now=Date.now()){
 const allowed=new Set(items.map(i=>i.id)),snapshots=new Set<string>(),intervals=new Set<string>();
 for(const sample of collector?.samples??[]){
  if(!allowed.has(sample.itemId)||Date.parse(sample.timestamp)>now||Date.parse(sample.timestamp)-(sample.intervalHours??0)*3600000<=now-30*86400000)continue;
  snapshots.add(sample.timestamp);if(sample.estimatedTurnoverPerHour!==null)intervals.add(sample.timestamp);
 }
 return {snapshots:snapshots.size,intervals:intervals.size,firstInterval:[...intervals].sort()[0]??null};
}
