import {createElement} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import type {HistoryData} from '../src/lib/types';
const plot=vi.hoisted(()=>({renders:0,mounts:0,unmounts:0}));
vi.mock('recharts',async()=>{
 const {createElement,useEffect}=await import('react');
 function Surface({children}:{children:unknown}){plot.renders++;useEffect(()=>{plot.mounts++;return()=>{plot.unmounts++;};},[]);return createElement('div',{'data-plot-surface':true},children as never);}
 return {ResponsiveContainer:Surface,LineChart:({children}:{children:unknown})=>createElement('div',{},children as never),Line:()=>null,XAxis:()=>null,YAxis:()=>null,CartesianGrid:()=>null,Tooltip:()=>null};
});
import ComparisonChart from '../src/components/ComparisonChart';
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const now=Date.parse('2026-11-17T22:00:00Z'),item={id:2589,name:'Linen Cloth',metadataVerified:true,source:'fixture'};
const history:HistoryData={itemId:2589,range:'7d',expiresAt:new Date(now+300000).toISOString(),latest:null,sales:null,series:[{timestamp:new Date(now).toISOString(),minBuyout:100,median:null,quantity:20}]};
let renderer:ReactTestRenderer|undefined;
function chart(histories:Record<number,HistoryData>,loading=false){return createElement(ComparisonChart,{items:[item],selection:{2589:{price:true,demand:false}},snapshots:[],histories,period:'7d',loading});}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);plot.renders=plot.mounts=plot.unmounts=0;const original=console.error;vi.spyOn(console,'error').mockImplementation((...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))original(...args);});});
afterEach(async()=>{if(renderer)await act(async()=>renderer!.unmount());renderer=undefined;vi.useRealTimers();vi.restoreAllMocks();});
it('does not redraw the plot for cache expiry renewal, cloned identical data or loading flags',async()=>{
 await act(async()=>{renderer=create(chart({2589:history}));});const renders=plot.renders;
 await act(async()=>renderer!.update(chart({2589:{...history,expiresAt:new Date(now+600000).toISOString(),series:history.series.map(p=>({...p}))}},true)));
 await act(async()=>renderer!.update(chart({2589:{...history,expiresAt:new Date(now+900000).toISOString()}},false)));
 expect(plot.renders).toBe(renders);expect(plot.mounts).toBe(1);expect(plot.unmounts).toBe(0);
});
it('keeps one plot mounted through empty/loading/error/recovery transitions',async()=>{
 await act(async()=>{renderer=create(chart({2589:history}));});await act(async()=>renderer!.update(chart({},true)));
 expect(renderer!.root.findAllByProps({'data-plot-surface':true})).toHaveLength(1);expect(plot.unmounts).toBe(0);
 await act(async()=>renderer!.update(chart({},false)));await act(async()=>renderer!.update(chart({2589:history})));
 expect(plot.mounts).toBe(1);expect(plot.unmounts).toBe(0);
});
it('does update when actual plotted prices change without remounting',async()=>{
 await act(async()=>{renderer=create(chart({2589:history}));});const renders=plot.renders;
 await act(async()=>renderer!.update(chart({2589:{...history,series:[{...history.series[0],minBuyout:250}]}})));
 expect(plot.renders).toBeGreaterThan(renders);expect(plot.mounts).toBe(1);
});
