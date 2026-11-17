import type {AuctionSnapshot,CatalogItem,HistoryData} from './types';
export type Metric='price'|'demand';
export type Selection=Record<number,{price:boolean;demand:boolean}>;
export function hourlyDemand(estimatedPerDay:number|null|undefined){
  if(estimatedPerDay==null)return null;
  if(!Number.isFinite(estimatedPerDay)||estimatedPerDay<0)throw new Error('Invalid estimated daily sales');
  return estimatedPerDay/24;
}
export function formatHourly(value:number|null|undefined){
  if(value==null)return 'Unavailable';
  if(value>0&&value<.01)return '<0.01';
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
}
export function defaultSelection(items:readonly CatalogItem[]):Selection{
  return Object.fromEntries(items.slice(0,2).map(item=>[item.id,{price:true,demand:true}]));
}
export function toggleMetric(selection:Selection,items:readonly CatalogItem[],itemId:number,metric:Metric):Selection{
  if(!items.some(item=>item.id===itemId))throw new Error('Comparison item is outside the active tab');
  const allowed=new Set(items.map(i=>i.id));
  const next:Selection=Object.fromEntries(Object.entries(selection).filter(([id])=>allowed.has(Number(id))));
  const current=next[itemId]??{price:false,demand:false};
  next[itemId]={...current,[metric]:!current[metric]};
  if(!next[itemId].price&&!next[itemId].demand)delete next[itemId];
  return next;
}
export function comparisonRows(items:readonly CatalogItem[],snapshots:AuctionSnapshot[],selection:Selection){
  const byId=new Map(snapshots.map(s=>[s.itemId,s]));
  return items.filter(item=>selection[item.id]?.price||selection[item.id]?.demand).map(item=>{
    const snapshot=byId.get(item.id),flags=selection[item.id];
    return {itemId:item.id,name:item.name,price:flags.price?snapshot?.minBuyout??null:null,demand:flags.demand?hourlyDemand(snapshot?.sales.estimatedPerDay):null,priceEnabled:flags.price,demandEnabled:flags.demand};
  });
}
export function historyRows(items:readonly CatalogItem[],selection:Selection,histories:Record<number,HistoryData>){
  const points=new Map<string,Record<string,string|number|null>>();
  for(const item of items){
    if(!selection[item.id]?.price)continue;
    const history=histories[item.id];if(!history||history.itemId!==item.id)continue;
    for(const point of history.series){
      const row=points.get(point.timestamp)??{timestamp:point.timestamp};
      row[`price_${item.id}`]=point.minBuyout;points.set(point.timestamp,row);
    }
  }
  return [...points.values()].sort((a,b)=>String(a.timestamp).localeCompare(String(b.timestamp)));
}
export const itemColors=['#35eaff','#f46bff','#86ff9f','#ffcc72','#b493ff','#ff819f','#68bdff','#e5ff75'];
