import {readFile} from 'node:fs/promises';
import {describe,it,expect} from 'vitest';
import {trackedIds,synchronizeTracking} from '../collector/catalog.mjs';
import {emptyState,advance,normalizeSnapshot} from '../collector/model.mjs';
const resources=JSON.parse(await readFile(new URL('../src/data/resources.json',import.meta.url))),crafting=JSON.parse(await readFile(new URL('../src/data/crafting-watchlist.json',import.meta.url)));
const now=Date.parse('2026-11-17T22:00:00Z'),snapshot=(ids,time,rows)=>normalizeSnapshot({auctions:rows},new Date(time).toUTCString(),ids,time),row=(id,itemId,quantity)=>({id,item:{id:itemId},quantity,unit_price:100});
describe('expanded collection allowlist',()=>{
 it('collects curated resources and crafted goods regardless of visitors selections',()=>{const ids=trackedIds(resources,crafting);expect(ids).toContain(13444);expect(ids).toContain(2589);expect(ids).toHaveLength(resources.length+crafting.length);expect(ids.length).toBeLessThanOrEqual(300);expect(ids.length*24*30).toBeLessThan(250000);});
 it('rejects unverified or duplicate entries',()=>{expect(()=>trackedIds(resources,[{id:999,name:'Unverified',metadataVerified:false}])).toThrow();expect(()=>trackedIds(resources,[resources[0]])).toThrow();});
 it('preserves existing history on expansion and establishes a baseline without invented past sales',()=>{
  const old=snapshot([2589],now,[row(1,2589,20)]),state=advance(emptyState(),old,now);synchronizeTracking(state,[2589,13444]);expect(state.catalogRefreshRequired).toBe(true);expect(state.samples).toHaveLength(1);
  advance(state,snapshot([2589,13444],now,[row(1,2589,20),row(2,13444,10)]),now);expect(state.samples).toHaveLength(2);expect(state.samples.find(s=>s.itemId===13444).estimatedTurnoverPerHour).toBeNull();
  advance(state,snapshot([2589,13444],now+3600000,[row(1,2589,15),row(2,13444,7)]),now+3600000);expect(state.samples.at(-1).estimatedTurnoverPerHour).toBe(3);
 });
 it('retains only allowed samples and listing baselines when a list is reduced',()=>{const state=advance(emptyState(),snapshot([2589,13444],now,[row(1,2589,20),row(2,13444,10)]),now);synchronizeTracking(state,[2589]);expect(state.samples.map(s=>s.itemId)).toEqual([2589]);expect(state.baseline.listings.map(s=>s.itemId)).toEqual([2589]);expect(Object.keys(state.baseline.totals)).toEqual(['2589']);});
});
