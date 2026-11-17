export class ProviderError extends Error {constructor(message:string,public status=502,public retryAfter=60){super(message);}}
export type Fetcher=(url:string,init:RequestInit)=>Promise<Response>;
interface Entry { body:string; expires:number; etag:string|null; checkedAt:number; }
export class ResponseCache {
 private entries=new Map<string,Entry>();private inflight=new Map<string,Promise<Entry>>();private blockedUntil=0;
 constructor(private fetcher:Fetcher,private now=()=>Date.now()){}
 async get(url:string,key?:string,revalidate=false){const old=this.entries.get(url);if(old&&old.expires>this.now()&&(!revalidate||old.expires-this.now()>15000||this.now()-old.checkedAt<5000))return old;const pending=this.inflight.get(url);if(pending)return pending;
 if(this.now()<this.blockedUntil)throw new ProviderError('AHledger rate limit; wait before retrying',429,Math.ceil((this.blockedUntil-this.now())/1000));
 const request=this.load(url,key,old,revalidate).finally(()=>this.inflight.delete(url));this.inflight.set(url,request);return request;}
 private async load(url:string,key?:string,old?:Entry,revalidate=false):Promise<Entry>{
 try{const headers:Record<string,string>={Accept:'application/json, text/plain'};if(key)headers.Authorization=`Bearer ${key}`;if(old?.etag)headers['If-None-Match']=old.etag;if(revalidate)headers['Cache-Control']='no-cache';
 const r=await this.fetcher(url,{headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!r.ok&&r.status!==304){const raw=r.headers.get('retry-after');const retry=raw?(/^\d+$/.test(raw)?Number(raw):Math.ceil((Date.parse(raw)-this.now())/1000)):60;const seconds=Math.max(1,Number.isFinite(retry)?retry:60);if(r.status===429)this.blockedUntil=this.now()+seconds*1000;throw new ProviderError(r.status===401?'AHledger API key rejected':r.status===403?'AHledger access denied for this history period':r.status===429?'AHledger rate limited the request':`AHledger returned HTTP ${r.status}`,r.status,seconds);}
 const cc=r.headers.get('cache-control')??'';const ttl=/no-store|no-cache/.test(cc)?0:Number(cc.match(/(?:^|,)\s*max-age=(\d+)/)?.[1]??0);const age=Number(r.headers.get('age')??0);const body=r.status===304&&old?old.body:await r.text();const entry={body,expires:this.now()+Math.max(0,ttl-age)*1000,etag:r.headers.get('etag')??(r.status===304?old?.etag??null:null),checkedAt:this.now()};
 // Expired bodies are retained only until conditional revalidation finishes, never served stale.
 if(ttl>0){this.entries.set(url,entry);const timer=setTimeout(()=>{if(this.entries.get(url)===entry)this.entries.delete(url);},Math.max(0,entry.expires-this.now()));timer.unref?.();}else this.entries.delete(url);
 return entry;
 }catch(e){if(old&&old.expires<=this.now())this.entries.delete(url);if(e instanceof ProviderError)throw e;throw new ProviderError('Cannot reach AHledger; no permitted cached response remains');}}
}
