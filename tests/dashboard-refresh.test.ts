import {createElement} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {HOUR,COLLECTOR_CHECK_INTERVAL} from '../src/lib/refresh-policy';
import {MARKET,type HistoryData,type AuctionSnapshot} from '../src/lib/types';
const chartRenders=vi.hoisted(()=>[] as {histories:Record<number,HistoryData>;snapshots?:AuctionSnapshot[]}[]);
vi.mock('../src/components/ComparisonChart',async()=>{const {memo}=await import('react');return {default:memo((props:{histories:Record<number,HistoryData>})=>{chartRenders.push(props);return null;})};});
import Dashboard from '../src/components/Dashboard';
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const now=Date.parse('2026-11-17T22:00:00Z');let renderer:ReactTestRenderer|undefined;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);chartRenders.length=0;vi.stubGlobal('window',{addEventListener:vi.fn(),removeEventListener:vi.fn()});const original=console.error;vi.spyOn(console,'error').mockImplementation((...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))original(...args);});});
afterEach(async()=>{if(renderer)await act(async()=>renderer!.unmount());renderer=undefined;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('preserves provider price history and local demand while collector checks run every 15 minutes',async()=>{
 const report={enabled:true,market:MARKET,houseId:114,status:'collecting',lastCheck:new Date(now).toISOString(),nextCheck:new Date(now+HOUR).toISOString(),lastObservation:new Date(now).toISOString(),stale:false,samples:[{itemId:2589,timestamp:new Date(now).toISOString(),minBuyout:100,quantity:20,estimatedTurnoverPerHour:10,intervalHours:1}]};
 const fetcher=vi.fn(async(url:string)=>{
  if(url.startsWith('/api/collector'))return Response.json(report);
  if(url.startsWith('/api/market'))return Response.json({market:MARKET,snapshots:[],expiresAt:new Date(now+60000).toISOString(),fetchedAt:new Date(now).toISOString(),stale:false});
  const id=Number(new URL(url,'http://localhost').searchParams.get('itemId'));return Response.json({itemId:id,range:'7d',expiresAt:new Date(Date.now()+60000).toISOString(),series:[{timestamp:new Date(now-2*86400000).toISOString(),minBuyout:50,median:null,quantity:100}],latest:null,sales:null});
 });vi.stubGlobal('fetch',fetcher);
 await act(async()=>{renderer=create(createElement(Dashboard));});
 expect(renderer!.root.findAllByProps({role:'switch'}).every(toggle=>toggle.props['aria-checked']===false)).toBe(true);
 expect(fetcher.mock.calls.some(([url])=>url.startsWith('/api/history'))).toBe(false);
 await act(async()=>{renderer!.root.findByProps({'aria-label':'Compare Linen Cloth price'}).props.onClick();renderer!.root.findByProps({'aria-label':'Compare Linen Cloth demand'}).props.onClick();});
 const renders=chartRenders.length,initialCalls=fetcher.mock.calls.length;
 expect(chartRenders.at(-1)?.histories[2589].priceSource).toBe('ahledger');
 expect(chartRenders.at(-1)?.histories[2589].series.some(p=>p.minBuyout===50)).toBe(true);
 expect(chartRenders.at(-1)?.histories[2589].series.some(p=>p.estimatedTurnoverPerHour===10)).toBe(true);
 await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
 expect(chartRenders).toHaveLength(renders);expect(fetcher).toHaveBeenCalledTimes(initialCalls);
 expect(JSON.stringify(renderer!.toJSON())).toContain('Snapshot checks: every 15 minutes');
 await act(async()=>{await vi.advanceTimersByTimeAsync(5*60000-5000);});
 const settled=chartRenders.slice(renders);expect(settled.every(p=>p.histories[2589].series.some(s=>s.minBuyout===50)&&p.histories[2589].series.some(s=>s.estimatedTurnoverPerHour===10))).toBe(true);
 const before=fetcher.mock.calls.filter(([url])=>url.startsWith('/api/collector')).length;
 await act(async()=>{await vi.advanceTimersByTimeAsync(COLLECTOR_CHECK_INTERVAL-5*60000);});
 expect(fetcher.mock.calls.filter(([url])=>url.startsWith('/api/collector'))).toHaveLength(before+1);
 expect(fetcher.mock.calls.filter(([url])=>url.startsWith('/api/market'))).toHaveLength(1);
 expect(chartRenders.at(-1)?.histories[2589].series.some(p=>p.minBuyout===50)).toBe(true);
 expect(chartRenders.at(-1)?.histories[2589].series.some(p=>p.estimatedTurnoverPerHour===10)).toBe(true);
});

it('does not schedule zero-delay market refreshes for a malformed expiry timestamp',async()=>{
 const fetcher=vi.fn(async(url:string)=>url.startsWith('/api/collector')?Response.json({enabled:false,market:MARKET,houseId:114,status:'not-started',samples:[],lastCheck:null,nextCheck:null,lastObservation:null,stale:true}):Response.json({market:MARKET,snapshots:[],expiresAt:'invalid timestamp'}));vi.stubGlobal('fetch',fetcher);
 await act(async()=>{renderer=create(createElement(Dashboard));});const calls=fetcher.mock.calls.length;
 await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});expect(fetcher).toHaveBeenCalledTimes(calls);expect(JSON.stringify(renderer!.toJSON())).toContain('Provider cache expired or invalid');
});

it('renews current fallback prices before expiry without blanking them during a slow response',async()=>{
 let resolveMarket!:(response:Response)=>void;const pending=new Promise<Response>(resolve=>{resolveMarket=resolve;});let marketCalls=0;
 const snapshot={itemId:2589,minBuyout:100,median:null,median7d:null,median30d:null,quantity:20,auctions:1,observedAt:new Date(now).toISOString(),sales:{estimatedPerDay:24},source:'fixture',url:'fixture'};
 const marketBody=()=>({market:MARKET,snapshots:[snapshot],expiresAt:new Date(Date.now()+300000).toISOString(),fetchedAt:new Date(Date.now()).toISOString(),stale:false});
 const fetcher=vi.fn(async(url:string)=>{
  if(url.startsWith('/api/collector'))return Response.json({enabled:false,market:MARKET,houseId:114,status:'not-started',samples:[],lastCheck:null,nextCheck:null,lastObservation:null,stale:true});
  if(url.startsWith('/api/market'))return ++marketCalls===1?Response.json(marketBody()):pending;
  return Response.json({itemId:2589,range:'7d',expiresAt:new Date(Date.now()+300000).toISOString(),series:[{timestamp:new Date(now).toISOString(),minBuyout:100,median:null,quantity:20}],latest:null,sales:null});
 });vi.stubGlobal('fetch',fetcher);
 await act(async()=>{renderer=create(createElement(Dashboard));});await act(async()=>renderer!.root.findByProps({'aria-label':'Compare Linen Cloth price'}).props.onClick());
 await act(async()=>{await vi.advanceTimersByTimeAsync(280000);});expect(marketCalls).toBe(2);expect(chartRenders.at(-1)?.snapshots?.[0].minBuyout).toBe(100);
 await act(async()=>resolveMarket(Response.json({...marketBody(),snapshots:[{...snapshot,minBuyout:200}]})));
 await act(async()=>{await vi.advanceTimersByTimeAsync(21000);});expect(chartRenders.at(-1)?.snapshots?.[0].minBuyout).toBe(200);
});
