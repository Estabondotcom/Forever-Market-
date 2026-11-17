import { GET as market } from '../src/app/api/market/route';
import { GET as history } from '../src/app/api/history/route';
import { categories,catalogFor } from '../src/lib/catalog';
import { MARKET } from '../src/lib/types';
for(const category of categories){
  const response=await market(new Request(`http://localhost/api/market?category=${category}`));
  const data=await response.json();
  if(response.status!==200||data.market!==MARKET||!data.snapshots.length)throw new Error(`${category}: ${JSON.stringify(data)}`);
  const expected=new Set(catalogFor(category).map(i=>i.id));
  if(data.snapshots.some((s:{itemId:number})=>!expected.has(s.itemId)))throw new Error('Unexpected catalog item');
  console.log(`${category}: HTTP ${response.status}, ${data.snapshots.length} real snapshots in ${MARKET}.`);
}
for(const id of [13422,2589,8170,10620,13468]){
  const response=await history(new Request(`http://localhost/api/history?itemId=${id}&range=7d`));
  const data=await response.json();
  if(response.status!==200||data.itemId!==id)throw new Error(JSON.stringify(data));
  console.log(`Item ${id}: HTTP ${response.status}, ${data.series.length} actual history points; estimated sales ${data.sales?.estimatedPerDay??'unavailable'}/day.`);
}
for(const path of ['/api/market?category=retail','/api/history?itemId=1&range=bogus']){
  const request=new Request(`http://localhost${path}`);
  const response=path.includes('/market')?await market(request):await history(request);
  if(response.status!==400)throw new Error('Invalid request accepted');
}
console.log('Invalid category/range rejected; no provider responses saved.');
