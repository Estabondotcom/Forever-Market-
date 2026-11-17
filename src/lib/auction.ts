import 'server-only';
import { EnvHttpProxyAgent,fetch as proxyFetch } from 'undici';
import { allItems,catalogFor,type MarketCategory } from './catalog';
import { MARKET,type MarketData } from './types';
import { ResponseCache,ProviderError } from './cache';
import { parseHistory,parsePriceTable,parseTooltip } from './parsers';
export interface AuctionAdapter { market(category?:MarketCategory):Promise<MarketData>; history(itemId:number,range:'24h'|'7d'|'30d'):Promise<unknown> }
// Proxy-aware transport also works on Windows without proxy variables.
const dispatcher=new EnvHttpProxyAgent();
const cache=new ResponseCache(async(url,init)=>await proxyFetch(url,{...init,dispatcher} as Parameters<typeof proxyFetch>[1]) as unknown as Response);
const base='https://api.ahledger.com';
async function get(path:string){return cache.get(base+path,process.env.AHLEDGER_API_KEY);}
export const auction:AuctionAdapter={
 async market(category='cloth'){const items=catalogFor(category);const [tooltip,table]=await Promise.all([get(`/v1/tooltip/${MARKET}?items=${items.map(f=>f.id).join(',')}`),get(`/v1/pricetable/${MARKET}`)]);const snapshots=parseTooltip(JSON.parse(tooltip.body),parsePriceTable(table.body));return {historyRanges:process.env.AHLEDGER_API_KEY||Date.now()<Date.parse('2026-12-10T00:00:00Z')?['24h','7d','30d']:['24h','7d'],market:MARKET,snapshots,fetchedAt:new Date().toISOString(),expiresAt:new Date(Math.min(tooltip.expires,table.expires)).toISOString(),stale:snapshots.some(s=>s.observedAt!==null&&Date.now()-Date.parse(s.observedAt)>7200000)};},
 async history(itemId,range){if(!allItems.some(f=>f.id===itemId))throw new ProviderError('Unknown catalog item ID',400);if(range==='30d'&&!process.env.AHLEDGER_API_KEY&&Date.now()>=Date.parse('2026-12-10T00:00:00Z'))throw new ProviderError('30-day history requires a free AHledger API key',403);const data=await get(`/v1/prices/${MARKET}/${itemId}?range=${range}`);return {...parseHistory(JSON.parse(data.body),itemId,range),expiresAt:new Date(data.expires).toISOString()};}
};
