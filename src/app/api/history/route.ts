import { auction } from '@/lib/auction';
import { ProviderError } from '@/lib/cache';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){const p=new URL(request.url).searchParams;const id=Number(p.get('itemId')),range=p.get('range')??'7d';if(!Number.isInteger(id)||!['24h','7d','30d'].includes(range))return Response.json({error:'Invalid item or range'},{status:400});try{return Response.json(await auction.history(id,range as '24h'|'7d'|'30d'),{headers:{'Cache-Control':'no-store'}});}catch(e){const error=e instanceof ProviderError?e:new ProviderError('Invalid historical price response');return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store','Retry-After':String(error.retryAfter)}});}}
