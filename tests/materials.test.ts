import {describe,it,expect} from 'vitest';
import {catalogFor,categories,isMarketCategory} from '../src/lib/catalog';
import {projectRevenue} from '../src/lib/revenue';
import {demoMarket} from '../src/lib/demo';
const input={unitsPerHour:100,priceCopper:1000,vendorCopper:10,estimatedSalesPerDay:100,sessionHours:1,ahCut:.05,marketShare:.05};
describe('material catalogs',()=>{
  it('verifies category sizes, positive unique IDs and provider batch limits',()=>{
    const ids:number[]=[];
    for(const category of categories){const catalog=catalogFor(category);expect(catalog.length).toBeLessThanOrEqual(100);expect(catalog.length).toBeGreaterThan(0);for(const item of catalog){expect(item.metadataVerified).toBe(true);expect(item.id).toBeGreaterThan(0);if(category!=='fishing')ids.push(item.id);}}
    expect(new Set(ids).size).toBe(52);expect(ids.length).toBe(52);
  });
  it('isolates categories instead of mixing fishing with gathering',()=>{
    expect(catalogFor('cloth').find(i=>i.id===2589)?.name).toBe('Linen Cloth');
    expect(catalogFor('leather').find(i=>i.id===8170)?.name).toBe('Rugged Leather');
    expect(catalogFor('ore').find(i=>i.id===10620)?.name).toBe('Thorium Ore');
    expect(catalogFor('herbs').find(i=>i.id===13468)?.name).toBe('Black Lotus');
    expect(catalogFor('fishing').some(i=>i.id===2589)).toBe(false);
  });
  it('rejects arbitrary categories and alternate market IDs',()=>{expect(isMarketCategory('retail')).toBe(false);expect(isMarketCategory('forever.normal.alliance.us')).toBe(false);});
  it('uses only requested category items in explicit demo',()=>{const demo=demoMarket(catalogFor('cloth'));expect(demo.demo).toBe(true);expect(demo.snapshots).toHaveLength(6);expect(demo.snapshots.map(a=>a.itemId)).toEqual(catalogFor('cloth').map(i=>i.id));});
});
describe('harvest revenue independent of fishing mechanics',()=>{
  it('uses measured units directly and caps assumed daily capacity',()=>{const result=projectRevenue(input);expect(result.auctionUnits).toBe(5);expect(result.vendorUnits).toBe(95);expect(result.revenuePerHour).toBe(5700);expect(result.grossPerHour).toBe(95000);});
  it('sums different outputs in a multi-material route',()=>{const cloth=projectRevenue(input),leather=projectRevenue({...input,unitsPerHour:20,estimatedSalesPerDay:10000});expect((cloth.revenuePerHour??0)+(leather.revenuePerHour??0)).toBe(24700);});
  it('does not expand one-day capacity for long sessions',()=>{expect(projectRevenue({...input,sessionHours:4}).auctionUnits).toBe(5);});
  it('preserves incomplete unknown sales and vendor fallback',()=>{expect(projectRevenue({...input,estimatedSalesPerDay:null}).revenuePerHour).toBeNull();expect(projectRevenue({...input,vendorCopper:null}).revenuePerHour).toBeNull();});
  it('handles zero yield and zero demand without divisions by zero',()=>{expect(projectRevenue({...input,unitsPerHour:0}).revenuePerHour).toBe(0);expect(projectRevenue({...input,estimatedSalesPerDay:0}).revenuePerHour).toBe(1000);});
  it('prefers a verified vendor value above auction net',()=>{expect(projectRevenue({...input,vendorCopper:1000}).revenuePerHour).toBe(100000);});
  it('rejects negative, nonfinite and invalid session/share data',()=>{for(const change of [{unitsPerHour:-1},{priceCopper:NaN},{estimatedSalesPerDay:-1},{sessionHours:0},{marketShare:1.1},{ahCut:NaN}])expect(()=>projectRevenue({...input,...change})).toThrow();});
});
