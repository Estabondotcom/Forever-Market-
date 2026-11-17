import type {CatalogItem} from './types';
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
export const itemColors=['#35eaff','#f46bff','#86ff9f','#ffcc72','#b493ff','#ff819f','#68bdff','#e5ff75'];
