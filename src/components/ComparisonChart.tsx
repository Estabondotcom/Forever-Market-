'use client';
import {useId} from 'react';
import {ResponsiveContainer,Line,LineChart,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import type {AuctionSnapshot,CatalogItem,HistoryData} from '@/lib/types';
import {comparisonRows,historyRows,itemColors,type Selection,formatHourly} from '@/lib/comparison';
import {money} from '@/lib/currency';
import {formatTime} from '@/lib/market';
export function SnapshotComparison({items,snapshots,selection}:{items:CatalogItem[];snapshots:AuctionSnapshot[];selection:Selection}){
  const id=useId().replaceAll(':',''),rows=comparisonRows(items,snapshots,selection);
  if(!rows.length)return <div className="chart-empty">Switch on price or demand beside an item to start comparing.</div>;
  return <div className="comparison-scroll"><div className="comparison-canvas" style={{minWidth:rows.length>3?rows.length*120+130:undefined}} role="img" aria-label="Current item comparison: a dotted line for estimated units sold per hour and a solid line for auction price">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:25,right:12,left:2,bottom:30}}>
      <defs><filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <CartesianGrid stroke="#22304a" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="name" interval={0} tick={{fontSize:9,fill:'#a8b8d1'}} tickFormatter={v=>String(v).replace(/^Raw /,'').replace(/ Cloth$/,'')} tickLine={false} axisLine={false} minTickGap={0}/>
      <YAxis yAxisId="price" width={82} tickFormatter={v=>money(v)} tick={{fontSize:9,fill:'#35eaff'}} tickLine={false} axisLine={false} domain={[0,'auto']} label={{value:'AH price / item',angle:-90,position:'insideLeft',fill:'#35eaff',fontSize:9,dx:0}}/>
      <YAxis yAxisId="demand" orientation="right" width={55} tickFormatter={v=>formatHourly(v)} tick={{fontSize:9,fill:'#f46bff'}} tickLine={false} axisLine={false} domain={[0,'auto']} label={{value:'Est. sold / hour',angle:90,position:'insideRight',fill:'#f46bff',fontSize:9}}/>
      <Tooltip contentStyle={{background:'#101728',border:'1px solid #394965',borderRadius:9,fontSize:11}} formatter={(value,name)=>typeof value==='number'?[name==='Current AH price'?money(value):`${new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(value)} est. units/hour`,name]:['Unavailable',name]}/>
      <Line yAxisId="demand" dataKey="demand" name="Estimated hourly demand" type="linear" stroke="#f46bff" strokeWidth={2.4} strokeDasharray="1 6" strokeLinecap="round" dot={{r:3,fill:'#f46bff'}} activeDot={{r:5}} connectNulls={false} filter={`url(#${id}-glow)`} isAnimationActive={false}/>
      <Line yAxisId="price" dataKey="price" name="Current AH price" type="linear" stroke="#35eaff" strokeWidth={2.4} dot={{r:3,fill:'#35eaff'}} activeDot={{r:5}} connectNulls={false} filter={`url(#${id}-glow)`} isAnimationActive={false}/>
    </LineChart></ResponsiveContainer>
  </div></div>;
}
export function PriceHistoryComparison({items,selection,histories}:{items:CatalogItem[];selection:Selection;histories:Record<number,HistoryData>}){
  const rows=historyRows(items,selection,histories),selected=items.filter(i=>selection[i.id]?.price);
  if(!selected.length)return <div className="chart-empty">Enable at least one item’s price toggle to compare price history.</div>;
  if(!rows.length)return <div className="chart-empty">No price-history points are currently available for the selected items.</div>;
  return <div className="comparison-canvas" role="img" aria-label="Solid neon lines comparing actual auction price histories for the active tab">
    <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:24,right:18,left:8,bottom:10}}>
      <CartesianGrid stroke="#22304a" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="timestamp" tickFormatter={v=>new Date(v).toLocaleDateString([],{month:'short',day:'numeric'})} minTickGap={45} tick={{fontSize:9,fill:'#8fa2bf'}} axisLine={false} tickLine={false}/>
      <YAxis width={83} tickFormatter={v=>money(v)} tick={{fontSize:9,fill:'#a4bad6'}} domain={['auto','auto']} axisLine={false} tickLine={false}/>
      <Tooltip contentStyle={{background:'#101728',border:'1px solid #394965',borderRadius:9,fontSize:11}} labelFormatter={v=>formatTime(String(v))} formatter={(value,name)=>[typeof value==='number'?money(value):'Unavailable',name]}/>
      {items.map((item,index)=>selection[item.id]?.price?<Line key={item.id} type="linear" dataKey={`price_${item.id}`} name={item.name} stroke={itemColors[index%itemColors.length]} strokeWidth={2} dot={rows.length===1?{r:3}:false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false}/>:null)}
    </LineChart></ResponsiveContainer>
  </div>;
}
