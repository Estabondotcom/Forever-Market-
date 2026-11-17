import {pathToFileURL} from 'node:url';

const ROOT='https://us.api.blizzard.com';
const NAMESPACE='dynamic-forever-us';
const RULESET=2;
const positiveInt=value=>Number.isSafeInteger(value)&&value>0;
function fail(message){throw new Error(message);}
export function apiUrl(path){
  const url=new URL(path,ROOT);
  if(url.origin!==ROOT||url.username||url.password||url.hash||!/^\/data\/wow\/ruleset\/2(?:\/|$)/.test(url.pathname))fail('Unexpected Blizzard API link; stopped before sending credentials.');
  if(url.searchParams.has('namespace')&&url.searchParams.get('namespace')!==NAMESPACE)fail('Unexpected namespace; US Forever only.');
  url.searchParams.set('namespace',NAMESPACE);url.searchParams.set('locale','en_US');
  return url.toString();
}
export function summarizeListings(data){
  if(!Array.isArray(data?.auctions))fail('No auction array supplied; this is not a verified listing snapshot.');
  const items=new Map();
  for(const auction of data.auctions){
    if(!positiveInt(auction?.id)||!positiveInt(auction?.item?.id)||!positiveInt(auction?.quantity))fail('Invalid auction listing response.');
    items.set(auction.item.id,(items.get(auction.item.id)??0)+auction.quantity);
  }
  return {auctions:data.auctions.length,distinctItems:items.size,units:[...items.values()].reduce((a,b)=>a+b,0)};
}
/** Discovery only: duplicate Horde names cannot establish the Normal market mapping.
 * @param {{clientId?:string,clientSecret?:string,houseId?:number,fetchImpl?:typeof fetch}} options
 */
export async function verifyBlizzard({clientId,clientSecret,houseId,fetchImpl=fetch}){
  if(!clientId?.trim()||!clientSecret?.trim())fail('Set BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET in .env.local first.');
  if(houseId!==undefined&&!positiveInt(houseId))fail('House ID must be a positive integer.');
  async function request(url,options,label){
    let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(60000)});}catch{fail(`${label}: network failure or timeout. No credentials or response bodies were printed.`);}
    if(!response.ok)fail(`${label}: HTTP ${response.status}${response.status===401?' (credentials/token rejected)':response.status===403?' (access denied)':response.status===404?' (endpoint/data unavailable)':response.status===429?' (rate limited; wait before retrying)':''}.`);
    let data;try{data=await response.json();}catch{fail(`${label}: invalid JSON response.`);}
    return {data,lastModified:response.headers.get('last-modified'),cacheControl:response.headers.get('cache-control')};
  }
  const auth=await request('https://oauth.battle.net/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'},'OAuth');
  if(typeof auth.data?.access_token!=='string'||!auth.data.access_token||String(auth.data.token_type).toLowerCase()!=='bearer')fail('OAuth returned an invalid token response.');
  const headers={Authorization:`Bearer ${auth.data.access_token}`};
  const get=(path,label)=>request(apiUrl(path),{headers},label);
  const ruleset=await get(`/data/wow/ruleset/${RULESET}`,'US Forever Normal ruleset');
  if(ruleset.data?.id!==RULESET||ruleset.data?.name!=='Normal')fail('Normal ruleset identity mismatch.');
  const index=await get(`/data/wow/ruleset/${RULESET}/auctions/`,'Auction-house index');
  if(!Array.isArray(index.data?.auctions)||!index.data.auctions.every(h=>positiveInt(h?.id)&&typeof h?.name==='string'))fail('Invalid auction-house index.');
  const houses=index.data.auctions.map(({id,name})=>({id,name}));
  const result={authentication:'passed',region:'US',namespace:NAMESPACE,ruleset:{id:RULESET,name:'Normal'},houses,marketMapping:'UNVERIFIED: a Normal ruleset URL alone does not prove the auction house belongs to US Normal Horde.'};
  /** @type {{id:number,name:string,snapshots:Array<Record<string,unknown>>}|undefined} */
  let candidateHouse;
  if(houseId!==undefined){
    const house=houses.find(h=>h.id===houseId);if(!house)fail('Selected house is absent from the returned index.');
    if(house.name!=='Horde Auction House')fail('Selected house is not labeled Horde Auction House.');
    const detail=await get(`/data/wow/ruleset/${RULESET}/auctions/${houseId}`,'Horde auction house');
    if(detail.data?.id!==houseId||detail.data?.name!==house.name)fail('Auction-house identity mismatch.');
    const snapshots=[];
    if(Array.isArray(detail.data.auctions))snapshots.push({type:'auctions',...summarizeListings(detail.data),lastModified:detail.lastModified,cacheControl:detail.cacheControl});
    else if(detail.data.auctions?.href){const snapshot=await get(detail.data.auctions.href,'Auction listings');snapshots.push({type:'auctions',...summarizeListings(snapshot.data),lastModified:snapshot.lastModified,cacheControl:snapshot.cacheControl});}
    if(detail.data.commodities?.href){const snapshot=await get(detail.data.commodities.href,'Commodity listings');snapshots.push({type:'commodities',...summarizeListings(snapshot.data),lastModified:snapshot.lastModified,cacheControl:snapshot.cacheControl});}
    if(!snapshots.length)fail('House returned no listing arrays or links; snapshot access is unverified.');
    candidateHouse={...house,snapshots};
  }
  return {...result,candidateHouse};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const args=process.argv.slice(2);
    if(args.length&&!(args.length===2&&args[0]==='--house'&&/^\d+$/.test(args[1])))fail('Usage: npm run verify:blizzard -- [--house NUMERIC_ID]');
    const report=await verifyBlizzard({clientId:process.env.BLIZZARD_CLIENT_ID,clientSecret:process.env.BLIZZARD_CLIENT_SECRET,houseId:args.length?Number(args[1]):undefined});
    console.log(JSON.stringify(report,null,2));
    console.log('Read-only discovery completed. No token, secret, listings or market history saved.');
    console.log('This is NOT a completed integration or a verified US Normal Horde market mapping. No collector has been enabled.');
  }catch(error){console.error(error.message);process.exitCode=1;}
}
