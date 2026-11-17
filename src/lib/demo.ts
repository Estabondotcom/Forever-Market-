import {catalogFor} from './catalog';
import { MARKET,type MarketData,type CatalogItem } from './types';
// Deliberately synthetic fixtures: opt-in browser mode only, never a production fallback.
export function demoMarket(items:CatalogItem[]=catalogFor('cloth')):MarketData {
  const now=new Date();return {market:MARKET,fetchedAt:now.toISOString(),expiresAt:new Date(+now+300000).toISOString(),stale:false,demo:true,snapshots:items.map((item,index)=>{
    const series=demoHistory(item.id,'7d'),last=series.at(-1)!;
    return {itemId:item.id,minBuyout:last.minBuyout,median:last.median,median7d:series[Math.floor(series.length/2)].median,median30d:series[0].median,quantity:100+(index%7)*120,auctions:20,observedAt:now.toISOString(),sales:{estimatedPerDay:last.estimatedSalesPerDay,coveredHours:120,windowDays:7},source:'SYNTHETIC DEMO',url:item.source};
  })};
}
export function demoHistory(id:number,range:string){
  const count=range==='24h'?24:range==='30d'?30:168,step=range==='30d'?86400000:3600000;
  const end=Math.floor(Date.now()/step)*step,phase=id%11/3;
  return Array.from({length:count},(_,index)=>{
    // Anchor to the endpoint so 7d and 30d previews agree on overlapping calendar dates.
    const offset=(index-(count-1))*step/86400000;
    return {timestamp:new Date(end+(index-(count-1))*step).toISOString(),minBuyout:200+id%100+Math.round(Math.sin(offset/3+phase)*70),median:240+id%100+Math.round(Math.sin(offset/4+phase)*50),quantity:500,estimatedSalesPerDay:Math.round((300+id%400)*(1+.3*Math.sin(offset/2+phase)))};
  });
}
