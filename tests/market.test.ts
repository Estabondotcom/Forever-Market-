import {describe,it,expect} from 'vitest';
import {currencyParts,fromCurrency,money} from '../src/lib/currency';
import {categories,catalogFor,isMarketCategory} from '../src/lib/catalog';
import {daysOfSupply,priceDeviation,marketRows,sortRows,marketWarnings,formatNumber} from '../src/lib/market';
import {demoMarket} from '../src/lib/demo';
import type {AuctionSnapshot,CatalogItem} from '../src/lib/types';
const now=new Date('2026-11-17T12:00:00Z');
const item:CatalogItem={id:1,name:'Fixture A',vendorCopper:null,metadataVerified:true,source:'fixture'};
const snapshot:AuctionSnapshot={itemId:1,minBuyout:1000,median:1100,median7d:900,median30d:850,quantity:100,auctions:10,observedAt:now.toISOString(),sales:{estimatedPerDay:20,coveredHours:100,windowDays:7},source:'fixture',url:'fixture'};
describe('currency',()=>{
  it('converts gold silver and copper',()=>{expect(fromCurrency(2,34,56)).toBe(23456);expect(currencyParts(23456)).toEqual({negative:false,gold:2,silver:34,copper:56});expect(money(23456)).toBe('2g 34s 56c');});
  it('rounds only at display and handles missing prices',()=>{expect(money(99.6)).toBe('0g 1s 0c');expect(money(null)).toBe('Unknown');expect(()=>currencyParts(NaN)).toThrow();});
});
describe('market catalogs',()=>{
  it('keeps category batches under the provider limit and validates catalog IDs',()=>{for(const category of categories){const items=catalogFor(category);expect(items.length).toBeGreaterThan(0);expect(items.length).toBeLessThanOrEqual(100);expect(new Set(items.map(i=>i.id)).size).toBe(items.length);expect(items.every(i=>i.id>0&&i.metadataVerified&&i.name.length>0)).toBe(true);}});
  it('contains all four material categories with verified representative names',()=>{expect(catalogFor('cloth').find(i=>i.id===2589)?.name).toBe('Linen Cloth');expect(catalogFor('leather').find(i=>i.id===8170)?.name).toBe('Rugged Leather');expect(catalogFor('ore').find(i=>i.id===10620)?.name).toBe('Thorium Ore');expect(catalogFor('herbs').find(i=>i.id===13468)?.name).toBe('Black Lotus');});
  it('rejects alternative markets as categories',()=>{expect(isMarketCategory('retail')).toBe(false);expect(isMarketCategory('forever.normal.alliance.us')).toBe(false);expect(isMarketCategory('cloth')).toBe(true);});
  it('keeps demo explicit and scoped to the selected category',()=>{const demo=demoMarket(catalogFor('cloth'));expect(demo.demo).toBe(true);expect(demo.snapshots.map(s=>s.itemId)).toEqual(catalogFor('cloth').map(i=>i.id));});
});
describe('demand and market comparisons',()=>{
  it('calculates days from quantities and estimated units, not auction counts',()=>expect(daysOfSupply(100,20)).toBe(5));
  it('preserves missing and zero sales as different states',()=>{expect(daysOfSupply(100,null)).toBeNull();expect(daysOfSupply(100,0)).toBe(Infinity);expect(daysOfSupply(0,0)).toBe(0);expect(daysOfSupply(null,10)).toBeNull();expect(formatNumber(0)).toBe('0');expect(formatNumber(null)).toBe('Unavailable');});
  it('rejects invalid supply and daily units',()=>{expect(()=>daysOfSupply(-1,20)).toThrow();expect(()=>daysOfSupply(100,NaN)).toThrow();});
  it('compares current price to history without dividing by zero',()=>{expect(priceDeviation(120,100)).toBeCloseTo(20);expect(priceDeviation(50,100)).toBe(-50);expect(priceDeviation(10,0)).toBeNull();expect(priceDeviation(null,100)).toBeNull();});
  it('keeps goods without observations in the catalog',()=>{const rows=marketRows([item,{...item,id:2}], [snapshot]);expect(rows[0].days).toBe(5);expect(rows[1].snapshot).toBeUndefined();expect(rows[1].days).toBeNull();});
  it('sorts price and estimated unit volume independently with missing data last',()=>{const items=[item,{...item,id:2,name:'Fixture B'},{...item,id:3,name:'Fixture C'}];const rows=marketRows(items,[snapshot,{...snapshot,itemId:2,minBuyout:10000,sales:{estimatedPerDay:1}}]);expect(sortRows(rows,'sales',false).map(r=>r.item.id)).toEqual([1,2,3]);expect(sortRows(rows,'price',false).map(r=>r.item.id)).toEqual([2,1,3]);expect(sortRows(rows,'sales',true).map(r=>r.item.id)).toEqual([2,1,3]);});
  it('sorts infinite days of supply safely',()=>{const rows=marketRows([item,{...item,id:2}],[{...snapshot,sales:{estimatedPerDay:0}},{...snapshot,itemId:2,sales:{estimatedPerDay:0}}]);expect(sortRows(rows,'days',false).map(r=>r.item.id)).toEqual([1,2]);});
  it('warns for old observations and missing sample information',()=>{const warnings=marketWarnings({...snapshot,observedAt:'2026-11-16T00:00:00Z'},null,now);expect(warnings.some(w=>w.includes('two hours'))).toBe(true);expect(warnings.some(w=>w.includes('coverage'))).toBe(true);});
  it('does not label estimated zero as missing or a small sample as verified',()=>{const warnings=marketWarnings(snapshot,{estimatedPerDay:0,coveredHours:2},now);expect(warnings.some(w=>w.includes('zero'))).toBe(true);expect(warnings.some(w=>w.includes('48 hours'))).toBe(true);expect(warnings.some(w=>w.includes('Not enough information'))).toBe(false);});
});
