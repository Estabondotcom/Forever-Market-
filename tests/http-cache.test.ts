import {describe,it,expect} from 'vitest';
import {sharedCacheSeconds} from '../src/lib/http-cache';
import {renewalDelay} from '../src/lib/refresh-policy';
describe('provider shared-cache lifetime',()=>{
 it('honors the actual 60-second browser / 300-second shared header',()=>{expect(sharedCacheSeconds(new Headers({'Cache-Control':'public, max-age=60, s-maxage=300'}))).toBe(300);});
 it('subtracts Age and never returns a negative lifetime',()=>{expect(sharedCacheSeconds(new Headers({'Cache-Control':'public, max-age=60, s-maxage=300',Age:'275'}))).toBe(25);expect(sharedCacheSeconds(new Headers({'Cache-Control':'max-age=60',Age:'61'}))).toBe(0);});
 it.each(['private, max-age=300','no-store, s-maxage=300','no-cache, max-age=60'])('refuses shared reuse for %s',control=>{expect(sharedCacheSeconds(new Headers({'Cache-Control':control}))).toBe(0);});
 it('falls back to max-age and handles quoted/case-insensitive directives',()=>{expect(sharedCacheSeconds(new Headers({'Cache-Control':'PUBLIC, S-MAXAGE="300", MAX-AGE=60'}))).toBe(300);expect(sharedCacheSeconds(new Headers({'Cache-Control':'max-age=60'}))).toBe(60);});
 it('renews a five-minute response with enough headroom for a slow request',()=>{expect(renewalDelay(300000)).toBe(270000);expect(300000-renewalDelay(300000)).toBeGreaterThan(20000);expect(renewalDelay(1000)).toBeGreaterThanOrEqual(1000);});
});
