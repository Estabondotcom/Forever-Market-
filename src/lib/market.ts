import type {AuctionSnapshot,CatalogItem,SalesEstimate} from './types';
export type SortKey='name'|'price'|'typical'|'supply'|'sales'|'days'|'trend';
export interface MarketRow {item:CatalogItem;snapshot:AuctionSnapshot|undefined;days:number|null;trend:number|null}
export function daysOfSupply(quantity:number|null,dailySales:number|null){
  for(const value of [quantity,dailySales])if(value!==null&&(!Number.isFinite(value)||value<0))throw new Error('Invalid supply or sales');
  if(quantity===null||dailySales===null)return null;
  return dailySales===0?(quantity===0?0:Infinity):quantity/dailySales;
}
export function priceDeviation(current:number|null,typical:number|null){
  return current===null||typical===null||typical<=0?null:100*(current/typical-1);
}
export function marketRows(items:readonly CatalogItem[],snapshots:AuctionSnapshot[]):MarketRow[]{
  const byId=new Map(snapshots.map(s=>[s.itemId,s]));
  return items.map(item=>{const snapshot=byId.get(item.id);return {item,snapshot,days:daysOfSupply(snapshot?.quantity??null,snapshot?.sales.estimatedPerDay??null),trend:priceDeviation(snapshot?.minBuyout??null,snapshot?.median7d??null)};});
}
export function sortRows(rows:MarketRow[],key:SortKey,ascending:boolean){
  const sign=ascending?1:-1;
  return [...rows].sort((a,b)=>{
    if(key==='name')return sign*a.item.name.localeCompare(b.item.name);
    const value=(r:MarketRow)=>key==='price'?r.snapshot?.minBuyout:key==='typical'?r.snapshot?.median7d:key==='supply'?r.snapshot?.quantity:key==='sales'?r.snapshot?.sales.estimatedPerDay:key==='days'?r.days:r.trend;
    const av=value(a),bv=value(b);
    if(av==null)return bv==null?a.item.name.localeCompare(b.item.name):1;
    if(bv==null)return -1;
    // Equality also handles two infinite days-of-supply values without subtracting them.
    return av===bv?a.item.name.localeCompare(b.item.name):sign*(av<bv?-1:1);
  });
}
export function marketWarnings(snapshot:AuctionSnapshot|undefined,sales:SalesEstimate|null,now=new Date()){
  const warnings:string[]=[];
  if(!snapshot)return ['No current market observation supplied.'];
  if(snapshot.minBuyout===null)warnings.push('No current lowest buyout supplied.');
  if(snapshot.observedAt===null||now.getTime()-Date.parse(snapshot.observedAt)>7200000)warnings.push('Auction observation is over two hours old or unavailable.');
  if(sales?.estimatedPerDay==null)warnings.push('Not enough information for an estimated sales rate.');
  else if(sales.estimatedPerDay===0)warnings.push('The provider currently estimates zero units sold per day.');
  if(sales?.coveredHours==null)warnings.push('Sales sample coverage is unavailable.');
  else if(sales.coveredHours<48)warnings.push('Limited sales sample: fewer than 48 hours of observations.');
  return warnings;
}
export function formatNumber(value:number|null|undefined){return value==null?'Unavailable':value===Infinity?'∞':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(value);}
export function formatTime(value:string|null|undefined){return value?new Date(value).toLocaleString():'No observation';}
