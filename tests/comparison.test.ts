import {describe,it,expect,vi} from 'vitest';
import {categories,categoryLabels,catalogFor} from '../src/lib/catalog';
import {hourlyDemand,formatHourly,defaultSelection,toggleMetric} from '../src/lib/comparison';
import {demoMarket,demoHistory} from '../src/lib/demo';
import type {HistoryData} from '../src/lib/types';
const cloth=catalogFor('cloth'),fish=catalogFor('fish');
describe('primary resources only',()=>{
  it('uses the requested tab names and order',()=>expect(categories.map(c=>categoryLabels[c])).toEqual(['Cloth','Fish','Herbs','Ore','Skinning']));
  it('excludes incidental catches and trophy fish',()=>{const names=fish.map(i=>i.name);expect(names.some(n=>/Chest|Potion|Crate|Bloated|Pound|Clam|Bottle/.test(n))).toBe(false);expect(fish.some(i=>i.id===13422)).toBe(true);expect(fish.some(i=>i.id===21071)).toBe(true);});
  it('keeps direct ore and leather but excludes mining and skinning byproducts',()=>{expect(catalogFor('ore').every(i=>i.name.endsWith(' Ore'))).toBe(true);expect(catalogFor('skinning').every(i=>i.name.endsWith(' Leather'))).toBe(true);expect(catalogFor('skinning')).toHaveLength(5);});
  it('includes Mageroyal and excludes incidental Swiftthistle and Wildvine',()=>{const ids=catalogFor('herbs').map(i=>i.id);expect(ids).toContain(785);expect(ids).not.toContain(2452);expect(ids).not.toContain(8153);});
});
describe('estimated average hourly demand',()=>{
  it('converts daily units to average hourly units',()=>{expect(hourlyDemand(2400)).toBe(100);expect(hourlyDemand(12)).toBe(.5);expect(hourlyDemand(0)).toBe(0);});
  it('preserves unavailable estimates and tiny nonzero rates',()=>{expect(hourlyDemand(null)).toBeNull();expect(hourlyDemand(undefined)).toBeNull();expect(formatHourly(.001)).toBe('<0.01');expect(formatHourly(0)).toBe('0');});
  it('rejects invalid daily volume',()=>{expect(()=>hourlyDemand(-1)).toThrow();expect(()=>hourlyDemand(Infinity)).toThrow();});
});
describe('independent comparison switches',()=>{
  it('enables multiple items and both metrics independently',()=>{let selection=toggleMetric({},cloth,cloth[0].id,'price');selection=toggleMetric(selection,cloth,cloth[1].id,'demand');expect(selection[cloth[0].id]).toEqual({price:true,demand:false});expect(selection[cloth[1].id]).toEqual({price:false,demand:true});selection=toggleMetric(selection,cloth,cloth[0].id,'demand');selection=toggleMetric(selection,cloth,cloth[0].id,'price');expect(selection[cloth[0].id]).toEqual({price:false,demand:true});});
  it('removes an item after its last metric is disabled',()=>{const selection=toggleMetric({},cloth,cloth[0].id,'price');expect(toggleMetric(selection,cloth,cloth[0].id,'price')).toEqual({});});
  it('prevents and prunes cross-tab selections',()=>{expect(()=>toggleMetric({},cloth,fish[0].id,'price')).toThrow();const selection=toggleMetric(defaultSelection(fish),cloth,cloth[0].id,'price');expect(Object.keys(selection)).toEqual([String(cloth[0].id)]);});
  it('starts each tab with its own defaults only',()=>{const selection=defaultSelection(fish);expect(Object.keys(selection)).toEqual(fish.slice(0,2).map(i=>String(i.id)));});
});

describe('sample history comparisons',()=>{
  it('aligns timestamps across items even when generation happens in different milliseconds',()=>{
    const clock=vi.spyOn(Date,'now').mockReturnValueOnce(1794916800100).mockReturnValueOnce(1794916800700);
    try{expect(demoHistory(2589,'7d').map(p=>p.timestamp)).toEqual(demoHistory(2592,'7d').map(p=>p.timestamp));}finally{clock.mockRestore();}
  });
  it('uses samples covering the selected historical period',()=>{
    const points=demoHistory(2589,'7d');const span=Date.parse(points.at(-1)!.timestamp)-Date.parse(points[0].timestamp);
    expect(span).toBeGreaterThanOrEqual(6*86400000);expect(span).toBeLessThanOrEqual(7*86400000);
  });
});
