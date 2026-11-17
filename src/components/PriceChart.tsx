'use client';
import {useId} from 'react';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import type {PriceHistoryPoint} from '@/lib/types';
import {money} from '@/lib/currency';
import {formatTime,formatNumber} from '@/lib/market';
export default function PriceChart({series,supply=false}:{series:PriceHistoryPoint[];supply?:boolean}){
  const id=useId().replaceAll(':','');
  return <div className={`price-chart ${supply?'supply-chart':''}`} role="img" aria-label={supply?'Line graph of units listed over time':'Neon line graph of lowest buyout and market median over time'}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{top:16,right:16,left:0,bottom:6}}>
      <defs>{['cyan','pink','green'].map(color=><filter key={color} id={`${id}-${color}`} x="-25%" y="-50%" width="150%" height="200%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>)}</defs>
      <CartesianGrid stroke="#1c263b" strokeDasharray="3 5" vertical={false}/>
      <XAxis dataKey="timestamp" tickFormatter={v=>new Date(v).toLocaleDateString([],{month:'short',day:'numeric'})} minTickGap={45} tick={{fill:'#8b9bb4',fontSize:10}} axisLine={false} tickLine={false}/>
      <YAxis width={83} tickFormatter={v=>supply?formatNumber(v):money(v)} tick={{fill:'#8b9bb4',fontSize:9}} axisLine={false} tickLine={false} domain={supply?[0,'auto']:['auto','auto']}/>
      <Tooltip contentStyle={{background:'#101627',border:'1px solid #38465f',borderRadius:10,fontSize:11,color:'#f0f4ff'}} labelFormatter={v=>formatTime(String(v))} formatter={v=>typeof v==='number'?(supply?`${formatNumber(v)} units`:money(v)):'Unavailable'}/>
      {supply?<Line type="linear" dataKey="quantity" name="Units listed" stroke="#53ffab" strokeWidth={2} dot={series.length===1?{r:3}:false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false} filter={`url(#${id}-green)`}/>:<>
        <Line type="linear" dataKey="minBuyout" name="Lowest buyout" stroke="#35eaff" strokeWidth={2.2} dot={series.length===1?{r:3}:false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false} filter={`url(#${id}-cyan)`}/>
        <Line type="linear" dataKey="median" name="Market median" stroke="#f46bff" strokeWidth={2} dot={series.length===1?{r:3}:false} activeDot={{r:4}} connectNulls={false} isAnimationActive={false} filter={`url(#${id}-pink)`}/>
      </>}
    </LineChart></ResponsiveContainer>
  </div>;
}
