import { EnvHttpProxyAgent,fetch } from 'undici';
import { parseHistory,parsePriceTable,parseTooltip } from '../src/lib/parsers';
import { MARKET } from '../src/lib/types';
const dispatcher=new EnvHttpProxyAgent();
async function get(path:string){const headers:Record<string,string>={};if(process.env.AHLEDGER_API_KEY)headers.Authorization=`Bearer ${process.env.AHLEDGER_API_KEY}`;const r=await fetch('https://api.ahledger.com'+path,{dispatcher,headers});if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);console.log(`PASS ${path.split('?')[0]} HTTP ${r.status}; cache=${r.headers.get('cache-control')}`);return r;}
const markets=await (await get('/v1/markets')).json() as {markets:{id:string}[]};if(!markets.markets.some(m=>m.id===MARKET))throw new Error('Fixed market missing');
const table=parsePriceTable(await (await get(`/v1/pricetable/${MARKET}`)).text());
const summaries=parseTooltip(await (await get(`/v1/tooltip/${MARKET}?items=13422`)).json(),table);if(summaries[0]?.itemId!==13422)throw new Error('Item missing');
const history=parseHistory(await (await get(`/v1/prices/${MARKET}/13422?range=7d`)).json(),13422,'7d');
const item=await (await get('/v1/items/13422?game=forever')).json() as {id:number;name:string;vendorSell:number};if(item.id!==13422||!Number.isInteger(item.vendorSell))throw new Error('Metadata mismatch');
console.log(`Verified ${item.name}; ${history.series.length} history points; observation ${history.latest?.observedAt}; estimated sales ${history.sales?.estimatedPerDay??'unavailable'}/day. No responses saved.`);
