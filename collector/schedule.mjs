import policy from '../src/data/collector-policy.json' with {type:'json'};
export const CHECK_INTERVAL=policy.checkIntervalMs;
/** Shorten an old normal schedule on upgrade; never bypass a saved error cooldown. */
export function migrateSchedule(state){
 const last=Date.parse(state.lastCheck??''),next=Date.parse(state.nextCheck??'');
 if(['collecting','unchanged','warming','gap'].includes(state.status)&&Number.isFinite(last)&&Number.isFinite(next))state.nextCheck=new Date(Math.min(next,last+CHECK_INTERVAL)).toISOString();
 return state;
}
