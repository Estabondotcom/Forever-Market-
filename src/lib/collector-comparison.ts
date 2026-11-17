import type {CatalogItem,CollectorData,HistoryData,PriceHistoryPoint} from './types';
/** Local Blizzard history is independent of AHledger response retention and credentials. */
export function collectedHistories(items:CatalogItem[],histories:Record<number,HistoryData>,collector:CollectorData|null,range:string,now=Date.now()){
 if(!collector?.enabled)return histories;
 const result={...histories},cutoff=now-(range==='30d'?30:range==='24h'?1:7)*86400000;
 for(const item of items){
  const samples=collector.samples.filter(s=>s.itemId===item.id&&Date.parse(s.timestamp)>cutoff&&Date.parse(s.timestamp)<=now);
  const existing=histories[item.id],useProvider=!!existing?.series.length;
  const local:PriceHistoryPoint[]=samples.map(s=>({timestamp:s.timestamp,minBuyout:useProvider?null:s.minBuyout,median:null,quantity:s.quantity,estimatedTurnoverPerHour:s.estimatedTurnoverPerHour,intervalHours:s.intervalHours}));
  result[item.id]={...(existing??{itemId:item.id,range,latest:null,sales:null,expiresAt:new Date(now+60000).toISOString()}),priceSource:useProvider?'ahledger':'blizzard-local',turnoverSource:true,series:[...(useProvider?existing.series.map(p=>({...p,estimatedSalesPerDay:undefined})):[]),...local]};
 }
 return result;
}
