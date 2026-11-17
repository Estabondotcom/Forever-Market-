/** A fixed allowlist, independent of visitors' temporary comparison selections. */
export function trackedIds(resources,crafting){
 const rows=[...resources,...crafting],ids=new Set();
 for(const row of rows){if(!Number.isSafeInteger(row?.id)||row.id<=0||!row.name?.trim()||row.metadataVerified!==true||ids.has(row.id))throw new Error('Invalid, unverified or duplicate tracked catalog item');ids.add(row.id);}
 if(ids.size>300)throw new Error('Review storage limits before tracking more than 300 curated items');
 return [...ids];
}
export function synchronizeTracking(state,ids){
 const allowed=new Set(ids);state.samples=state.samples.filter(sample=>allowed.has(sample.itemId));
 if(state.baseline){
  state.baseline.listings=state.baseline.listings.filter(listing=>allowed.has(listing.itemId));
  state.baseline.totals=Object.fromEntries(Object.entries(state.baseline.totals).filter(([id])=>allowed.has(Number(id))));
  if(ids.some(id=>!Object.hasOwn(state.baseline.totals,id))){state.catalogRefreshRequired=true;state.etag=null;}
 }
 return state;
}
