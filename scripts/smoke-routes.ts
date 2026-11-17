import { GET as market } from '../src/app/api/market/route';
import { GET as history } from '../src/app/api/history/route';
import { evaluateLocation,rankLocations } from '../src/lib/engine';
import fish from '../src/data/fish.json';
import locations from '../src/data/locations.json';
import { defaults } from '../src/lib/settings';
import type { MarketData,FishingLocation } from '../src/lib/types';
const response=await market(new Request('http://localhost/api/market'));if(response.status!==200)throw new Error(await response.text());const data=await response.json() as MarketData;
console.log(`Market route: ${response.status}, ${data.snapshots.length} real snapshots; fixed market ${data.market}`);
const ranked=rankLocations((locations as FishingLocation[]).map(l=>evaluateLocation(l,fish,data.snapshots,defaults)));
console.log(`Engine: ${ranked.filter(r=>r.rankable).length} rankable Classic-derived estimates; ${ranked.filter(r=>!r.rankable).length} explicitly unranked.`);
const hr=await history(new Request('http://localhost/api/history?itemId=13422&range=7d'));const hd=await hr.json();if(hr.status!==200)throw new Error(JSON.stringify(hd));console.log(`History route: ${hr.status}, ${hd.series.length} actual points.`);
const invalid=await history(new Request('http://localhost/api/history?itemId=1&range=bogus'));if(invalid.status!==400)throw new Error('Validation failed');console.log('Invalid-range route: 400, passed.');

for(const category of ['cloth','leather','ore','herbs']){
 const response=await market(new Request(`http://localhost/api/market?category=${category}`));
 const data=await response.json();if(response.status!==200||!data.snapshots.length)throw new Error(`${category}: ${JSON.stringify(data)}`);
 console.log(`Material route ${category}: ${response.status}, ${data.snapshots.length} real snapshots.`);
}
const clothHistory=await history(new Request('http://localhost/api/history?itemId=2589&range=7d'));
const clothData=await clothHistory.json();if(clothHistory.status!==200)throw new Error(JSON.stringify(clothData));console.log(`Linen Cloth history: ${clothHistory.status}, ${clothData.series.length} actual points.`);
