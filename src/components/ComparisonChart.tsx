'use client';
import {memo,useId} from 'react';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import type {CatalogItem,HistoryData,AuctionSnapshot} from '@/lib/types';
import {itemColors,formatHourly,type Selection} from '@/lib/comparison';
import {dailyTimeline,dayLabel,type TimelinePeriod} from '@/lib/timeline';
import {money} from '@/lib/currency';
export default memo(function ComparisonChart({items,snapshots,selection,histories,period,loading=false}:{items:CatalogItem[];snapshots:AuctionSnapshot[];selection:Selection;histories:Record<number,HistoryData>;period:TimelinePeriod;loading?:boolean}){
  const id=useId().replaceAll(':',''),{rows,currentDemandIds}=dailyTimeline(items,snapshots,selection,histories,period);
  if(!items.some(item=>selection[item.id]?.price||selection[item.id]?.demand))return <div className="chart-empty">Enable price or demand beside an item to compare its timeline.</div>;
  const hasPoints=rows.some(row=>Object.entries(row).some(([key,value])=>key!=='day'&&typeof value==='number'));
  if(!hasPoints&&loading)return <div className="chart-empty" role="status">Loading observations…</div>;
  if(!hasPoints)return <div className="chart-empty">No observations available for the selected items and period. Missing history is never filled with sample data.</div>;
  return <div className="comparison-canvas timeline-canvas" role="img" aria-label={`${period==='3d'?'Seventy-two hourly':period==='7d'?'Seven daily':'Thirty daily'} points comparing item prices as solid lines and estimated demand as dotted lines`}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:24,right:12,left:3,bottom:16}}>
      <defs><filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <CartesianGrid stroke="#22304a" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="day" interval={period==='7d'?0:'preserveStartEnd'} minTickGap={25} tickFormatter={dayLabel} tick={{fontSize:9,fill:'#a2b7d5'}} axisLine={false} tickLine={false}/>
      <YAxis yAxisId="price" width={80} domain={[0,'auto']} tickFormatter={value=>money(value)} tick={{fontSize:9,fill:'#9edfea'}} tickLine={false} axisLine={false}/>
      <YAxis yAxisId="demand" orientation="right" width={47} domain={[0,'auto']} tickFormatter={formatHourly} tick={{fontSize:9,fill:'#d7a9e9'}} tickLine={false} axisLine={false}/>
      <Tooltip contentStyle={{background:'#101728',border:'1px solid #394965',borderRadius:9,fontSize:10}} labelFormatter={value=>`${dayLabel(String(value))} · UTC${String(value)===rows.at(-1)?.day?' · current period / partial':''}`} formatter={(value,name,entry)=>{
        const key=String(entry.dataKey),demand=key.startsWith('demand_'),itemId=Number(key.split('_')[1]);
        const coverage=entry.payload?.[`coverage_${itemId}`];
        const basis=demand?(histories[itemId]?.turnoverSource?` — estimated turnover; ${typeof coverage==='number'?coverage.toFixed(2):'?'} observed hours; includes cancellations/expirations`:currentDemandIds.includes(itemId)?' — current rolling estimate only':''):'';
        return [typeof value==='number'?(demand?`${new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(value)} est. units/hour${basis}`:money(value)):'Unavailable',name];
      }}/>
      {items.flatMap((item,index)=>{
        const flags=selection[item.id],color=itemColors[index%itemColors.length];
        if(!flags)return [];
        return [flags.price?<Line key={`price-${item.id}`} yAxisId="price" dataKey={`price_${item.id}`} name={`${item.name} · price`} type="linear" stroke={color} strokeWidth={2.2} dot={{r:2.3,fill:color}} activeDot={{r:4}} connectNulls={false} isAnimationActive={false} filter={`url(#${id}-glow)`}/>:null,
          flags.demand?<Line key={`demand-${item.id}`} yAxisId="demand" dataKey={`demand_${item.id}`} name={`${item.name} · demand`} type="linear" stroke={color} strokeWidth={2.2} strokeDasharray="1 6" strokeLinecap="round" dot={{r:2.3,fill:color}} activeDot={{r:4}} connectNulls={false} isAnimationActive={false} filter={`url(#${id}-glow)`}/>:null];
      })}
    </LineChart></ResponsiveContainer>
  </div>;
});
