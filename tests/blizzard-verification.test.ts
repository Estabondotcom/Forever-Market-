import {describe,it,expect} from 'vitest';
import {apiUrl,summarizeListings,verifyBlizzard} from '../scripts/verify-blizzard.mjs';
const credentials={clientId:'fixture-client',clientSecret:'fixture-secret'};
function mockFetch(responses:unknown[]){let i=0;return async()=>new Response(JSON.stringify(responses[i++]),{status:200});}
const token={access_token:'fixture-token',token_type:'bearer'};
const ruleset={id:2,name:'Normal'};
const index={auctions:[{id:111,name:'Horde Auction House'},{id:114,name:'Horde Auction House'},{id:110,name:'Alliance Auction House'}]};
describe('Blizzard read-only verification',()=>{
  it('enforces US Forever links and rejects credential leakage through redirects/foreign hosts',()=>{expect(apiUrl('/data/wow/ruleset/2')).toContain('namespace=dynamic-forever-us');for(const url of ['https://example.com/data/wow/ruleset/2','https://eu.api.blizzard.com/data/wow/ruleset/2','/data/wow/ruleset/2?namespace=dynamic-us'])expect(()=>apiUrl(url)).toThrow();});
  it('requires locally configured credentials',async()=>{await expect(verifyBlizzard({clientId:'',clientSecret:''})).rejects.toThrow('Set BLIZZARD');});
  it('discovers houses without claiming market identity or revealing credentials',async()=>{const report=await verifyBlizzard({...credentials,fetchImpl:mockFetch([token,ruleset,index])});expect(report.houses).toHaveLength(3);expect(report.marketMapping).toContain('UNVERIFIED');expect(JSON.stringify(report)).not.toMatch(/fixture-(token|secret|client)/);});
  it('rejects the wrong ruleset and wrong faction',async()=>{await expect(verifyBlizzard({...credentials,fetchImpl:mockFetch([token,{id:1,name:'PvP'}])})).rejects.toThrow('identity mismatch');await expect(verifyBlizzard({...credentials,houseId:110,fetchImpl:mockFetch([token,ruleset,index])})).rejects.toThrow('not labeled Horde');});
  it('handles HTTP authentication errors without printing response bodies',async()=>{await expect(verifyBlizzard({...credentials,fetchImpl:async()=>new Response('fixture-secret',{status:401})})).rejects.toThrow('OAuth: HTTP 401');});
  it('summarizes a candidate snapshot and retains unresolved mapping',async()=>{const report=await verifyBlizzard({...credentials,houseId:111,fetchImpl:mockFetch([token,ruleset,index,{id:111,name:'Horde Auction House',auctions:[{id:10,item:{id:2589},quantity:20},{id:11,item:{id:2589},quantity:5}]}])});expect(report.candidateHouse?.snapshots[0]).toMatchObject({auctions:2,units:25,distinctItems:1});expect(report.marketMapping).toContain('UNVERIFIED');});
  it('rejects malformed listings and preserves a genuine empty snapshot',()=>{expect(summarizeListings({auctions:[]})).toEqual({auctions:0,units:0,distinctItems:0});expect(()=>summarizeListings({auctions:[{id:1,item:{id:2589},quantity:-1}]})).toThrow();expect(()=>summarizeListings({})).toThrow();});
});
