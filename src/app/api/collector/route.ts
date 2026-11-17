import {catalogFor,isMarketCategory} from '@/lib/catalog';
import {readCollector} from '@/lib/collector';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const category=new URL(request.url).searchParams.get('category')??'cloth';if(!isMarketCategory(category))return Response.json({error:'Invalid category'},{status:400});return Response.json(await readCollector(catalogFor(category).map(i=>i.id)),{headers:{'Cache-Control':'no-store'}});}
