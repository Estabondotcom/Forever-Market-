import {describe,it,expect} from 'vitest';
import {collectedHistories} from '../src/lib/collector-comparison';
import {dailyTimeline} from '../src/lib/timeline';
import {MARKET,type CollectorData,type HistoryData} from '../src/lib/types';
const now=Date.parse('2026-11-17T22:00:00Z'),item={id:2589,name:'Linen Cloth',metadataVerified:true,source:'fixture'};
const collector:CollectorData={enabled:true,market:MARKET,houseId:114,status:'collecting',lastCheck:null,nextCheck:null,lastObservation:new Date(now).toISOString(),stale:false,samples:[{itemId:2589,timestamp:new Date(now-3600000).toISOString(),minBuyout:100,quantity:20,estimatedTurnoverPerHour:10,intervalHours:1},{itemId:2589,timestamp:new Date(now).toISOString(),minBuyout:200,quantity:30,estimatedTurnoverPerHour:20,intervalHours:2}]};
describe('local turnover history integration',()=>{
 it('renders local price fallback and actual dated turnover on one graph',()=>{const histories=collectedHistories([item],{},collector,'7d',now);expect(histories[2589].priceSource).toBe('blizzard-local');const graph=dailyTimeline([item],[],{2589:{price:true,demand:true}},histories,'3d',new Date(now));expect(graph.rows.at(-1)?.demand_2589).toBe(20);expect(graph.rows.at(-1)?.price_2589).toBe(200);});
 it('keeps AHledger prices separate from local demand estimates',()=>{const provider:HistoryData={itemId:2589,range:'7d',expiresAt:new Date(now+60000).toISOString(),latest:null,sales:null,series:[{timestamp:new Date(now).toISOString(),minBuyout:50,median:null,quantity:4}]};const histories=collectedHistories([item],{2589:provider},collector,'7d',now);expect(histories[2589].priceSource).toBe('ahledger');expect(dailyTimeline([item],[],{2589:{price:true,demand:true}},histories,'7d',new Date(now)).rows.at(-1)?.price_2589).toBe(50);});
 it('weights daily rates by measured duration',()=>{const histories=collectedHistories([item],{},collector,'7d',now);expect(dailyTimeline([item],[],{2589:{price:false,demand:true}},histories,'7d',new Date(now)).rows.at(-1)?.demand_2589).toBeCloseTo(50/3);});
 it('does not backfill missing intervals or substitute rolling sales for a warming collector',()=>{const histories=collectedHistories([item],{}, {...collector,samples:[]},'7d',now);const graph=dailyTimeline([item],[],{2589:{price:false,demand:true}},histories,'7d',new Date(now));expect(graph.rows.every(r=>r.demand_2589===null)).toBe(true);expect(graph.currentDemandIds).toEqual([]);});
 it('does not mix foreign items or observations outside the selected range',()=>{const histories=collectedHistories([item],{}, {...collector,samples:[{...collector.samples[0],itemId:999},{...collector.samples[0],timestamp:new Date(now-31*86400000).toISOString()}]},'7d',now);expect(histories[2589].series).toEqual([]);});
});

import {collectedMarket} from '../src/lib/collector-comparison';
describe('hourly collector as the primary dashboard source',()=>{
 it('uses recorded prices and explicit turnover without fabricating daily sales',()=>{const result=collectedMarket([item],collector,now)!;expect(result.market.snapshots[0].minBuyout).toBe(200);expect(result.demand.get(2589)).toBe(20);expect(result.market.snapshots[0].sales.estimatedPerDay).toBeNull();expect(result.market.snapshots[0].source).toContain('Blizzard');});
 it('keeps unavailable turnover distinct from a measured zero',()=>{const warming=collectedMarket([item],{...collector,samples:[{...collector.samples[0],estimatedTurnoverPerHour:null}]},now)!;const zero=collectedMarket([item],{...collector,samples:[{...collector.samples[0],estimatedTurnoverPerHour:0}]},now)!;expect(warming.demand.get(2589)).toBeNull();expect(zero.demand.get(2589)).toBe(0);});
 it('rejects unstarted, wrong-tab, future or expired sample rows',()=>{expect(collectedMarket([item],{...collector,enabled:false},now)).toBeNull();for(const samples of [[{...collector.samples[0],itemId:999}],[{...collector.samples[0],timestamp:new Date(now+3600000).toISOString()}],[{...collector.samples[0],timestamp:new Date(now-31*86400000).toISOString()}]])expect(collectedMarket([item],{...collector,samples},now)).toBeNull();});
 it('uses locally recorded prices consistently when requested, even with AHledger history available',()=>{const provider:HistoryData={itemId:2589,range:'7d',expiresAt:new Date(now+60000).toISOString(),latest:null,sales:null,series:[{timestamp:new Date(now).toISOString(),minBuyout:999,median:null,quantity:1}]};const histories=collectedHistories([item],{2589:provider},collector,'7d',now,true);expect(histories[2589].priceSource).toBe('blizzard-local');expect(histories[2589].series.some(p=>p.minBuyout===999)).toBe(false);});
});

import {demandCoverage} from '../src/lib/collector-comparison';
describe('saved demand diagnostics',()=>{
 it('distinguishes a baseline from measured demand history',()=>{const baseline={...collector,samples:[{...collector.samples[0],estimatedTurnoverPerHour:null,intervalHours:null}]};expect(demandCoverage([item],baseline,now)).toEqual({snapshots:1,intervals:0,firstInterval:null});});
 it('counts measured zero as a real saved interval and does not count each fish as a separate snapshot',()=>{const zero={...collector,samples:[{...collector.samples[0],estimatedTurnoverPerHour:0},{...collector.samples[0],itemId:999,estimatedTurnoverPerHour:0}]};expect(demandCoverage([item],zero,now).intervals).toBe(1);});
});

import {itemDemandStatus} from '../src/lib/collector-comparison';
describe('per-item demand readiness in mixed Search comparisons',()=>{
 it('does not apply an existing resource demand status to a newly tracked potion',()=>{
  expect(itemDemandStatus(2589,collector,now)).toBeNull();
  expect(itemDemandStatus(13444,collector,now)).toContain('Not recorded yet');
  const expanded={...collector,samples:[...collector.samples,{...collector.samples[0],itemId:13444,estimatedTurnoverPerHour:null,intervalHours:null}]};
  expect(itemDemandStatus(13444,expanded,now)).toContain('Baseline saved');
 });
 it('recognizes measured zero, long gaps, errors and expired history separately',()=>{
  expect(itemDemandStatus(2589,{...collector,samples:[{...collector.samples[0],estimatedTurnoverPerHour:0}]},now)).toBeNull();
  expect(itemDemandStatus(2589,{...collector,samples:collector.samples.map(s=>({...s,estimatedTurnoverPerHour:null,intervalHours:null}))},now)).toContain('No comparable recent interval');
  expect(itemDemandStatus(2589,{...collector,status:'history-unavailable'},now)).toBe('Saved history unavailable');
  expect(itemDemandStatus(2589,collector,now+31*86400000)).toContain('Not recorded yet');
  expect(itemDemandStatus(2589,null,now)).toBeNull();
 });
});
