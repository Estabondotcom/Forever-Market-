const ROOT='https://us.api.blizzard.com';
/** Periodic conditional revalidation, without cache-busting query parameters. */
export async function fetchSnapshot({clientId,clientSecret,baseline,etag,fetchImpl=fetch,now=Date.now()}){
  if(!clientId||!clientSecret)throw new Error('credentials-missing');
  const request=async(url,options)=>{
    let r;try{r=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(90000)});}catch{throw new Error('network-error');}
    if(r.status===304)return r;
    if(!r.ok){const error=new Error(`http-${r.status}`);const retry=r.headers.get('retry-after');error.retryMs=/^\d+$/.test(retry??'')?Number(retry)*1000:Math.max(0,Date.parse(retry??'')-now)||3600000;throw error;}
    return r;
  };
  const auth=await request('https://oauth.battle.net/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  let token;try{const body=await auth.json();token=body.access_token;if(typeof token!=='string'||!token||String(body.token_type).toLowerCase()!=='bearer')throw new Error();}catch{throw new Error('invalid-token-response');}
  const headers={Authorization:`Bearer ${token}`,'Cache-Control':'no-cache'};
  if(etag)headers['If-None-Match']=etag;
  if(baseline)headers['If-Modified-Since']=new Date(baseline.observedAt).toUTCString();
  const url=ROOT+'/data/wow/ruleset/2/auctions/114/commodities?namespace=dynamic-forever-us&locale=en_US';
  const response=await request(url,{headers});
  if(response.status===304)return {unchanged:true};
  if(/\bno-store\b/i.test(response.headers.get('cache-control')??''))throw new Error('provider-forbids-storage');
  let data;try{data=await response.json();}catch{throw new Error('invalid-json');}
  return {unchanged:false,data,lastModified:response.headers.get('last-modified'),etag:response.headers.get('etag'),cacheControl:response.headers.get('cache-control')};
}
