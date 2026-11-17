import {describe,it,expect} from 'vitest';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadState,saveState} from '../collector/store.mjs';
import {advance,emptyState,normalizeSnapshot,TTL} from '../collector/model.mjs';
const now=Date.parse('2026-11-17T22:00:00Z');
async function temporary(test){const directory=await mkdtemp(join(tmpdir(),'forever-collector-'));try{await test(directory);}finally{await rm(directory,{recursive:true,force:true});}}
describe('persistent collector state',()=>{
 it('survives restarts without losing the baseline or double-counting a repeated snapshot',async()=>temporary(async directory=>{const snapshot=normalizeSnapshot({auctions:[{id:1,item:{id:2589},quantity:20,unit_price:100}]},new Date(now).toUTCString(),[2589],now);await saveState(directory,advance(emptyState(),snapshot,now),now);const recovered=await loadState(directory,now);advance(recovered,snapshot,now);expect(recovered.samples).toHaveLength(1);expect(recovered.baseline.listings[0].quantity).toBe(20);expect((await stat(join(directory,'history.json'))).mode&0o777).toBe(0o600);}));
 it('prunes expired records on recovery even if the worker was offline',async()=>temporary(async directory=>{const snapshot=normalizeSnapshot({auctions:[]},new Date(now).toUTCString(),[2589],now);await saveState(directory,advance(emptyState(),snapshot,now),now);expect((await loadState(directory,now+TTL+1)).samples).toEqual([]);}));
 it('does not silently overwrite corrupt history',async()=>temporary(async directory=>{await writeFile(join(directory,'history.json'),'not valid JSON');await expect(loadState(directory,now)).rejects.toThrow('protect existing history');expect(await readFile(join(directory,'history.json'),'utf8')).toBe('not valid JSON');}));
});
