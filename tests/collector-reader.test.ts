import {describe,it,expect,vi} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
vi.mock('server-only',()=>({}));
import {readCollector} from '../src/lib/collector';
import {MARKET} from '../src/lib/types';
const now=Date.parse('2026-11-17T22:00:00Z');
async function fixture(data:unknown,test:()=>Promise<void>){const directory=await mkdtemp(join(tmpdir(),'forever-reader-')),previous=process.env.BLIZZARD_HISTORY_PATH;process.env.BLIZZARD_HISTORY_PATH=join(directory,'history.json');try{await writeFile(process.env.BLIZZARD_HISTORY_PATH,JSON.stringify(data));await test();}finally{if(previous===undefined)delete process.env.BLIZZARD_HISTORY_PATH;else process.env.BLIZZARD_HISTORY_PATH=previous;await rm(directory,{recursive:true,force:true});}}
const sample={itemId:2589,timestamp:new Date(now).toISOString(),minBuyout:100,quantity:20,estimatedTurnoverPerHour:10,intervalHours:1};
const state={version:1,market:MARKET,houseId:114,status:'collecting',lastCheck:new Date(now).toISOString(),nextCheck:null,baseline:{observedAt:new Date(now).toISOString(),listings:[{private:'not for the browser'}]},samples:[sample,{...sample,itemId:2592}]};
describe('collector browser boundary',()=>{
 it('returns only the category, strips raw baselines and enforces retention',async()=>fixture({...state,samples:[...state.samples,{...sample,timestamp:new Date(now-31*86400000).toISOString()}]},async()=>{const report=await readCollector([2589],now);expect(report.samples).toHaveLength(1);expect(JSON.stringify(report)).not.toContain('not for the browser');expect(report.stale).toBe(false);}));
 it('rejects a mismatched house rather than exposing another market',async()=>fixture({...state,houseId:113},async()=>{expect((await readCollector([2589],now)).status).toBe('history-unavailable');}));
 it('rejects invalid negative demand rather than plotting it',async()=>fixture({...state,samples:[{...sample,estimatedTurnoverPerHour:-1}]},async()=>{expect((await readCollector([2589],now)).samples).toEqual([]);}));
});
