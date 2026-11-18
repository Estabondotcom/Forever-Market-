/** This process shares cached provider responses across requests: s-maxage takes precedence. */
export function sharedCacheSeconds(headers:Headers){
 const control=headers.get('cache-control')??'';
 if(/(?:^|,)\s*(?:no-store|no-cache|private)(?:\s*(?:,|=|$))/i.test(control))return 0;
 const shared=control.match(/(?:^|,)\s*s-maxage\s*=\s*"?(\d+)"?/i),general=control.match(/(?:^|,)\s*max-age\s*=\s*"?(\d+)"?/i);
 const seconds=Number(shared?.[1]??general?.[1]??0),reportedAge=Number(headers.get('age')??0),age=Number.isFinite(reportedAge)&&reportedAge>=0?reportedAge:0;
 return Number.isFinite(seconds)&&seconds>=0?Math.max(0,seconds-age):0;
}
