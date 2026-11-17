import type {CatalogItem} from './types';
export const SEARCH_LIST_LIMIT=20;
export function searchCatalog(items:readonly CatalogItem[],query:string,excluded:readonly number[]=[],limit=8){
 const term=query.trim().toLocaleLowerCase('en-US');if(term.length<2)return [];
 const skip=new Set(excluded),tokens=term.split(/\s+/);
 return items.filter(item=>!skip.has(item.id)&&(String(item.id)===term||tokens.every(t=>item.name.toLocaleLowerCase('en-US').includes(t))))
 .sort((a,b)=>Number(!a.name.toLocaleLowerCase('en-US').startsWith(term))-Number(!b.name.toLocaleLowerCase('en-US').startsWith(term))||a.name.localeCompare(b.name)).slice(0,limit);
}
/** Each page owns its IDs in React state; no server writes or shared preference storage. */
export function addSearchItem(current:number[],id:number,catalog:readonly CatalogItem[]){
 if(current.includes(id))return current;
 if(current.length>=SEARCH_LIST_LIMIT||!catalog.some(item=>item.id===id))throw new Error('Item is unavailable or the comparison list is full');
 return [...current,id];
}
export function parseTrackedIds(raw:string,catalog:readonly CatalogItem[],limit=SEARCH_LIST_LIMIT){
 if(!/^\d+(,\d+)*$/.test(raw))throw new Error('Invalid item IDs');
 const ids=raw.split(',').map(Number),known=new Set(catalog.map(i=>i.id));
 if(ids.length>limit||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||!known.has(id)))throw new Error('Unknown, duplicate or too many tracked items');
 return ids;
}
