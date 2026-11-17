import type {AuctionSnapshot,CatalogItem,HistoryData} from './types';
import {hourlyDemand,type Selection} from './comparison';
export type TimelinePeriod='3d'|'7d'|'30d';
export type TimelineRow={day:string;[key:string]:string|number|null};
const DAY=86400000;
export function calendarDays(period:TimelinePeriod,now=new Date()){
  if(!['7d','30d'].includes(period)||!Number.isFinite(now.getTime()))throw new Error('Invalid timeline period or date');
  const count=period==='30d'?30:7,end=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
  return Array.from({length:count},(_,index)=>new Date(end-(count-1-index)*DAY).toISOString().slice(0,10));
}
export function timelineBuckets(period:TimelinePeriod,now=new Date()){
  if(period!=='3d')return calendarDays(period,now);
  if(!Number.isFinite(now.getTime()))throw new Error('Invalid timeline date');
  const end=Math.floor(now.getTime()/3600000)*3600000;
  return Array.from({length:72},(_,i)=>new Date(end-(71-i)*3600000).toISOString());
}
/** Missing historical demand remains null. The current rolling estimate is a single, labeled point. */
export function dailyTimeline(items:readonly CatalogItem[],snapshots:AuctionSnapshot[],selection:Selection,histories:Record<number,HistoryData>,period:TimelinePeriod,now=new Date()){
  const days=timelineBuckets(period,now),today=days.at(-1)!,allowed=new Set(days),rows:TimelineRow[]=days.map(day=>({day}));
  const byDay=new Map(rows.map(row=>[row.day,row])),byId=new Map(snapshots.map(s=>[s.itemId,s]));
  const currentDemandIds:number[]=[],missingDemandIds:number[]=[];
  for(const item of items){
    const flags=selection[item.id];if(!flags?.price&&!flags?.demand)continue;
    const priceKey=`price_${item.id}`,demandKey=`demand_${item.id}`;
    for(const row of rows){if(flags.price)row[priceKey]=null;if(flags.demand)row[demandKey]=null;}
    const history=histories[item.id],demandSamples=new Map<string,{rate:number;weight:number}[]>();
    if(history?.itemId===item.id&&history.range===(period==='3d'?'7d':period)){
      for(const point of history.series){
        const time=Date.parse(point.timestamp);if(!Number.isFinite(time))continue;
        const day=period==='3d'?new Date(Math.floor(time/3600000)*3600000).toISOString():new Date(time).toISOString().slice(0,10);if(!allowed.has(day))continue;
        const row=byDay.get(day)!;
        if(flags.price&&point.minBuyout!==null){
          if(!Number.isFinite(point.minBuyout)||point.minBuyout<0)throw new Error('Invalid historical price');
          const previous=row[priceKey];row[priceKey]=typeof previous==='number'?Math.min(previous,point.minBuyout):point.minBuyout;
        }
        if(flags.demand&&(point.estimatedTurnoverPerHour!=null||point.estimatedSalesPerDay!=null)){
          const rate=point.estimatedTurnoverPerHour??hourlyDemand(point.estimatedSalesPerDay)!;
          if(!Number.isFinite(rate)||rate<0)throw new Error('Invalid demand rate');
          const weight=point.estimatedTurnoverPerHour!=null?(point.intervalHours??1):1;
          if(!Number.isFinite(weight)||weight<=0)throw new Error('Invalid demand interval');
          const samples=demandSamples.get(day)??[];samples.push({rate,weight});demandSamples.set(day,samples);
        }
      }
    }
    if(flags.demand){
      if(demandSamples.size){for(const [day,samples] of demandSamples){const covered=samples.reduce((a,b)=>a+b.weight,0);byDay.get(day)![demandKey]=samples.reduce((a,b)=>a+b.rate*b.weight,0)/covered;if(history?.turnoverSource)byDay.get(day)![`coverage_${item.id}`]=covered;}}
      else if(!history?.turnoverSource){
        // No flat backfill: this estimate belongs only at the current endpoint, never on past dates.
        const current=hourlyDemand(byId.get(item.id)?.sales.estimatedPerDay??(history?.itemId===item.id&&history.range===(period==='3d'?'7d':period)?history.sales?.estimatedPerDay:undefined));
        if(current!==null){byDay.get(today)![demandKey]=current;currentDemandIds.push(item.id);}else missingDemandIds.push(item.id);
      }
    }
  }
  return {rows,currentDemandIds,missingDemandIds};
}
export function dayLabel(day:string){const hourly=day.includes('T');return new Date(hourly?day:`${day}T00:00:00Z`).toLocaleString('en-US',{month:'short',day:'numeric',...(hourly?{hour:'numeric' as const}:{}),timeZone:'UTC'});}
