import { auction } from '@/lib/auction';
import { allItems,isMarketCategory } from '@/lib/catalog';
import {parseTrackedIds} from '@/lib/search';
import { ProviderError } from '@/lib/cache';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const params=new URL(request.url).searchParams,category=params.get('category')??'cloth';let ids:number[]|undefined;if(params.has('items')){try{ids=parseTrackedIds(params.get('items')!,allItems);}catch{return Response.json({error:'Invalid tracked item selection'},{status:400});}}if(!isMarketCategory(category))return Response.json({error:'Unknown market category'},{status:400});try{return Response.json(await (ids?auction.marketItems(ids):auction.market(category)),{headers:{'Cache-Control':'no-store'}});}catch(e){const error=e instanceof ProviderError?e:new ProviderError('Invalid auction response; cannot safely display prices');return Response.json({error:error.message},{status:error.status>=400&&error.status<600?error.status:502,headers:{'Cache-Control':'no-store','Retry-After':String(error.retryAfter)}});}}
