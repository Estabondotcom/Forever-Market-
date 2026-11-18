import {createElement} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useCollector} from '../src/hooks/useCollector';
import {useHistories} from '../src/hooks/useHistories';
import {HOUR,RETENTION} from '../src/lib/refresh-policy';
import {MARKET,type CollectorData} from '../src/lib/types';
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let renderer:ReactTestRenderer|undefined;
const now=Date.parse('2026-11-17T22:00:00Z');
const report:CollectorData={enabled:true,market:MARKET,houseId:114,status:'collecting',lastCheck:new Date(now).toISOString(),nextCheck:new Date(now+HOUR).toISOString(),lastObservation:new Date(now).toISOString(),stale:false,samples:[{itemId:2589,timestamp:new Date(now).toISOString(),minBuyout:100,quantity:20,estimatedTurnoverPerHour:10,intervalHours:1}]};
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);const original=console.error;vi.spyOn(console,'error').mockImplementation((...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))original(...args);});});
afterEach(async()=>{if(renderer)await act(async()=>renderer!.unmount());renderer=undefined;vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('collector refresh regression',()=>{
 it('checks hourly, not every minute, and keeps the saved graph during manual refresh',async()=>{
  const fetcher=vi.fn().mockImplementation(async()=>Response.json(report));vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useCollector>;const seen:(CollectorData|null)[]=[];
  function Probe({refresh=0}){latest=useCollector('cloth',false,refresh);seen.push(latest.data);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});expect(latest.data?.samples).toHaveLength(1);
  await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});expect(fetcher).toHaveBeenCalledTimes(1);
  const pending=deferred<Response>();fetcher.mockReturnValueOnce(pending.promise);seen.length=0;
  await act(async()=>renderer!.update(createElement(Probe,{refresh:1})));expect(latest.data?.samples).toHaveLength(1);expect(seen.every(Boolean)).toBe(true);
  await act(async()=>pending.resolve(Response.json(report)));expect(latest.error).toBe('');
  fetcher.mockImplementation(async()=>Response.json(report));await act(async()=>{await vi.advanceTimersByTimeAsync(HOUR);});expect(fetcher).toHaveBeenCalledTimes(3);expect(latest.data?.samples).toHaveLength(1);
 });
 it('retains real local history on network failure and does not enter a minute retry loop',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json(report)).mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useCollector>;function Probe({refresh=0}){latest=useCollector('cloth',false,refresh);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});await act(async()=>renderer!.update(createElement(Probe,{refresh:1})));
  expect(latest.data?.samples[0].minBuyout).toBe(100);expect(latest.error).toContain('Saved observations remain visible');
  await act(async()=>{await vi.advanceTimersByTimeAsync(60000);});expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('does not carry a prior tab into a pending new tab request',async()=>{
  const pending=deferred<Response>(),fetcher=vi.fn().mockResolvedValueOnce(Response.json(report)).mockReturnValueOnce(pending.promise);vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useCollector>;function Probe({category='cloth'}){latest=useCollector(category,false,0);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});await act(async()=>renderer!.update(createElement(Probe,{category:'fish'})));expect(latest.data).toBeNull();
  await act(async()=>pending.resolve(Response.json({...report,samples:[{...report.samples[0],itemId:13422}]})));expect(latest.data?.samples[0].itemId).toBe(13422);
 });
 it('expires retained Blizzard data at thirty days without a minute network poll',async()=>{
  const timestamp=new Date(now-RETENTION+HOUR/2).toISOString(),fetcher=vi.fn().mockResolvedValue(Response.json({...report,lastObservation:timestamp,samples:[{...report.samples[0],timestamp,intervalHours:null}]}));vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useCollector>;function Probe(){latest=useCollector('cloth',false,0);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});expect(latest.data?.samples).toHaveLength(1);
  await act(async()=>{await vi.advanceTimersByTimeAsync(HOUR/2+1);});expect(latest.data?.samples).toEqual([]);expect(latest.data?.lastObservation).toBeNull();expect(fetcher).toHaveBeenCalledTimes(1);
 });
});
describe('per-item history refresh regression',()=>{
 function history(id:number,expiresAt:number){return {itemId:id,range:'7d',expiresAt:new Date(expiresAt).toISOString(),latest:null,sales:null,series:[{timestamp:new Date(now).toISOString(),minBuyout:id,median:null,quantity:10}]};}
 it('expiring one item neither clears another item nor refetches the entire selection',async()=>{
  const fetcher=vi.fn(async(url:string)=>{const id=Number(new URL(url,'http://localhost').searchParams.get('itemId'));return Response.json(history(id,Date.now()+(id===1?3:10)*60000));});vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useHistories>;function Probe(){latest=useHistories([1,2],'7d',true,false,0);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});expect(Object.keys(latest.histories)).toEqual(['1','2']);
  await act(async()=>{await vi.advanceTimersByTimeAsync(3*60000+300);});expect(fetcher).toHaveBeenCalledTimes(3);expect(fetcher.mock.calls.filter(([url])=>url.includes('itemId=2'))).toHaveLength(1);expect(latest.histories[2].series[0].minBuyout).toBe(2);
 });
 it('preserves valid lines while a manual refresh is pending and keeps a stable result between renders',async()=>{
  const pending=deferred<Response>(),fetcher=vi.fn().mockResolvedValueOnce(Response.json(history(1,now+HOUR))).mockReturnValueOnce(pending.promise);vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useHistories>;function Probe({refresh=0}){latest=useHistories([1],'7d',true,false,refresh);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});const first=latest.histories;
  await act(async()=>renderer!.update(createElement(Probe)));expect(latest.histories).toBe(first);
  await act(async()=>renderer!.update(createElement(Probe,{refresh:1})));expect(latest.histories[1].series[0].minBuyout).toBe(1);
  await act(async()=>pending.resolve(Response.json(history(1,now+HOUR))));expect(latest.errors).toEqual({});
 });
 it('rejects expired provider history without a fast expiration/refetch loop',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json(history(1,now-1)));vi.stubGlobal('fetch',fetcher);
  let latest!:ReturnType<typeof useHistories>;function Probe(){latest=useHistories([1],'7d',true,false,0);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});expect(latest.histories).toEqual({});expect(latest.errors[1]).toContain('expired');
  await act(async()=>{await vi.advanceTimersByTimeAsync(5*60000);});expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('makes no AHledger history requests when fetching is explicitly disabled',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  function Probe(){useHistories([1,2],'7d',false,false,0);return null;}
  await act(async()=>{renderer=create(createElement(Probe));});await act(async()=>{await vi.advanceTimersByTimeAsync(HOUR);});expect(fetcher).not.toHaveBeenCalled();
 });
});

it('renews provider history before expiry without clearing its existing line',async()=>{
 const fetcher=vi.fn(async()=>Response.json({itemId:1,range:'7d',expiresAt:new Date(Date.now()+60000).toISOString(),latest:null,sales:null,series:[{timestamp:new Date(now-86400000).toISOString(),minBuyout:100,median:null,quantity:1}]}));vi.stubGlobal('fetch',fetcher);
 let latest!:ReturnType<typeof useHistories>;const seen:boolean[]=[];function Probe(){latest=useHistories([1],'7d',true,false,0);seen.push(!!latest.histories[1]);return null;}
 await act(async()=>{renderer=create(createElement(Probe));});seen.length=0;
 await act(async()=>{await vi.advanceTimersByTimeAsync(65000);});expect(fetcher).toHaveBeenCalledTimes(2);expect(seen.every(Boolean)).toBe(true);expect(latest.errors).toEqual({});
});

it('does not enter a rapid refresh loop when history permission lasts only a second',async()=>{
 const fetcher=vi.fn(async()=>Response.json({itemId:1,range:'7d',expiresAt:new Date(Date.now()+1000).toISOString(),latest:null,sales:null,series:[]}));vi.stubGlobal('fetch',fetcher);
 function Probe(){useHistories([1],'7d',true,false,0);return null;}
 await act(async()=>{renderer=create(createElement(Probe));});await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});expect(fetcher).toHaveBeenCalledTimes(1);
});
