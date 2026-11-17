import {allItems,catalogFor,isMarketCategory} from '@/lib/catalog';
import {parseTrackedIds} from '@/lib/search';
import {readCollector} from '@/lib/collector';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const params=new URL(request.url).searchParams,category=params.get('category')??'cloth';let ids:number[]|undefined;if(params.has('items')){try{ids=parseTrackedIds(params.get('items')!,allItems);}catch{return Response.json({error:'Invalid tracked item selection'},{status:400});}}if(!isMarketCategory(category))return Response.json({error:'Invalid category'},{status:400});return Response.json(await readCollector(ids??catalogFor(category).map(i=>i.id)),{headers:{'Cache-Control':'no-store'}});}
