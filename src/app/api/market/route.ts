import { auction } from '@/lib/auction';
import { isMarketCategory } from '@/lib/catalog';
import { ProviderError } from '@/lib/cache';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const category=new URL(request.url).searchParams.get('category')??'cloth';if(!isMarketCategory(category))return Response.json({error:'Unknown market category'},{status:400});try{return Response.json(await auction.market(category),{headers:{'Cache-Control':'no-store'}});}catch(e){const error=e instanceof ProviderError?e:new ProviderError('Invalid auction response; cannot safely display prices');return Response.json({error:error.message},{status:error.status>=400&&error.status<600?error.status:502,headers:{'Cache-Control':'no-store','Retry-After':String(error.retryAfter)}});}}
