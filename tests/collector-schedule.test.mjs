import {describe,it,expect} from 'vitest';
import {CHECK_INTERVAL,migrateSchedule} from '../collector/schedule.mjs';
import {COLLECTOR_CHECK_INTERVAL} from '../src/lib/refresh-policy';
const last=Date.parse('2026-11-18T00:00:00Z');
describe('15-minute collector schedule',()=>{
 it('uses the same 15-minute interval in the worker and browser',()=>{expect(CHECK_INTERVAL).toBe(15*60000);expect(COLLECTOR_CHECK_INTERVAL).toBe(CHECK_INTERVAL);});
 it('shortens a saved hourly success schedule without resetting history',()=>{
  const samples=[{itemId:2589}],state={status:'collecting',lastCheck:new Date(last).toISOString(),nextCheck:new Date(last+3600000).toISOString(),samples};
  expect(migrateSchedule(state).nextCheck).toBe(new Date(last+900000).toISOString());expect(state.samples).toBe(samples);
 });
 it.each(['http-429','http-503','collection-error'])('preserves saved cooldowns for %s',status=>{
  const state={status,lastCheck:new Date(last).toISOString(),nextCheck:new Date(last+7200000).toISOString()};expect(migrateSchedule(state).nextCheck).toBe(new Date(last+7200000).toISOString());
 });
 it('does not postpone a check already due sooner',()=>{const state={status:'unchanged',lastCheck:new Date(last).toISOString(),nextCheck:new Date(last+60000).toISOString()};expect(migrateSchedule(state).nextCheck).toBe(new Date(last+60000).toISOString());});
});
