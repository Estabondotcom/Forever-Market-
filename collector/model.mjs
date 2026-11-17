export const MARKET='forever.normal.horde.us';
export const HOUSE=114;
export const TTL=30*86400000;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export function emptyState(){return {version:1,market:MARKET,houseId:HOUSE,baseline:null,samples:[],status:'waiting',lastCheck:null,nextCheck:null};}
export function prune(state,now=Date.now()){
  if(state.version!==1||state.market!==MARKET||state.houseId!==HOUSE||!Array.isArray(state.samples))throw new Error('Invalid collector state identity');
  state.samples=state.samples.filter(s=>Date.parse(s.timestamp)-(s.intervalHours??0)*3600000>now-TTL);
  if(state.baseline&&Date.parse(state.baseline.observedAt)<=now-TTL){state.baseline=null;state.etag=null;state.cacheControl=null;}
  return state;
}
/** Only tracked commodity listings are retained; never seller/character information. */
export function normalizeSnapshot(data,lastModified,ids,now=Date.now()){
  const time=Date.parse(lastModified??'');
  if(!Number.isFinite(time)||time>now+300000||time<=now-TTL)throw new Error('Missing, future or expired Last-Modified timestamp');
  if(!Array.isArray(data?.auctions))throw new Error('Invalid commodity snapshot');
  const allowed=new Set(ids),seen=new Set(),listings=[];
  const totals=Object.fromEntries(ids.map(id=>[id,{minBuyout:null,quantity:0}]));
  for(const a of data.auctions){
    if(!integer(a?.id)||!a.id||!integer(a?.item?.id)||!a.item.id||!integer(a?.quantity)||!a.quantity||!integer(a?.unit_price))throw new Error('Invalid commodity listing');
    if(seen.has(a.id))throw new Error('Duplicate auction ID');seen.add(a.id);
    if(!allowed.has(a.item.id))continue;
    listings.push({id:a.id,itemId:a.item.id,quantity:a.quantity});
    const total=totals[a.item.id];total.quantity+=a.quantity;
    if(!Number.isSafeInteger(total.quantity))throw new Error('Quantity overflow');
    total.minBuyout=total.minBuyout===null?a.unit_price:Math.min(total.minBuyout,a.unit_price);
  }
  return {observedAt:new Date(time).toISOString(),listings,totals};
}
export function advance(state,next,now=Date.now()){
  prune(state,now);
  const previous=state.baseline,end=Date.parse(next.observedAt),start=previous?Date.parse(previous.observedAt):null;
  if(start!==null&&end<=start){
    if(end===start){
      // A freshly fetched full snapshot can establish baselines for newly tracked IDs.
      // No past rates are inferred for items absent from the old allowlist.
      const added=new Set(Object.keys(next.totals).filter(id=>!Object.hasOwn(previous.totals,id)).map(Number));
      for(const id of added){previous.totals[id]=next.totals[id];state.samples.push({itemId:id,timestamp:next.observedAt,...next.totals[id],estimatedTurnoverPerHour:null,intervalHours:null});}
      previous.listings.push(...next.listings.filter(listing=>added.has(listing.itemId)));
    }
    state.status='unchanged';return state;
  }
  const hours=start===null?null:(end-start)/3600000;
  // Long outages do not become a falsely precise hourly demand measurement.
  const validInterval=hours!==null&&hours>=.25&&hours<=2;
  const gone=Object.fromEntries(Object.keys(next.totals).map(id=>[id,0]));
  if(validInterval){
    const current=new Map(next.listings.map(a=>[a.id,a]));
    for(const old of previous.listings){const match=current.get(old.id);if(match&&match.itemId!==old.itemId)throw new Error('Auction ID changed item');gone[old.itemId]=(gone[old.itemId]??0)+Math.max(0,old.quantity-(match?.quantity??0));}
  }
  for(const [id,total] of Object.entries(next.totals))state.samples.push({itemId:Number(id),timestamp:next.observedAt,...total,estimatedTurnoverPerHour:validInterval&&previous.totals[id]?gone[id]/hours:null,intervalHours:validInterval&&previous.totals[id]?hours:null});
  state.baseline=next;state.status=!previous?'warming':validInterval?'collecting':'gap';
  return state;
}
/** Stable bounded diagnostics; raw response bodies and credentials never enter storage. */
export function publicReport(state,ids,now=Date.now()){
  prune(state,now);const allowed=new Set(ids);
  const samples=state.samples.filter(s=>allowed.has(s.itemId));
  return {enabled:true,market:MARKET,houseId:HOUSE,mapping:'Community mapping: house 114 = US Normal Horde; not labeled by Blizzard',status:state.status,lastCheck:state.lastCheck,nextCheck:state.nextCheck,lastObservation:state.baseline?.observedAt??null,stale:!state.baseline||now-Date.parse(state.baseline.observedAt)>2*3600000,samples};
}
