import {describe,it,expect} from 'vitest';
import {allItems,categories,catalogFor} from '../src/lib/catalog';
import crafting from '../src/data/crafting-watchlist.json';
import {searchCatalog,addSearchItem,parseTrackedIds,SEARCH_LIST_LIMIT} from '../src/lib/search';
describe('curated search catalog',()=>{
 it('keeps the five farming lists unchanged and puts extras only in the searchable catalog',()=>{expect(categories.map(c=>catalogFor(c).length)).toEqual([6,25,26,9,5]);expect(allItems).toHaveLength(71+crafting.length);expect(new Set(allItems.map(i=>i.id)).size).toBe(allItems.length);expect(catalogFor('fish').some(i=>i.id===13444)).toBe(false);expect(allItems.every(i=>i.metadataVerified&&i.source.startsWith('https://ahledger.com/'))).toBe(true);});
 it('does not list the catalog until at least two characters have been typed',()=>{expect(searchCatalog(allItems,'')).toEqual([]);expect(searchCatalog(allItems,'m')).toEqual([]);});
 it('autocompletes case-insensitive words and exact IDs, excluding added items',()=>{expect(searchCatalog(allItems,'MAJOR MANA')[0].id).toBe(13444);expect(searchCatalog(allItems,'13444')[0].name).toBe('Major Mana Potion');expect(searchCatalog(allItems,'major mana',[13444])).toEqual([]);expect(searchCatalog(allItems,'potion mana').some(i=>i.id===13444)).toBe(true);});
 it('caps suggestions and rejects duplicate, unsupported and oversized server selections',()=>{expect(searchCatalog(allItems,'potion').length).toBeLessThanOrEqual(8);expect(parseTrackedIds('13444,2589',allItems)).toEqual([13444,2589]);for(const raw of ['', '13444,13444','999999999','2589,-1','1e3','2589,abc',allItems.slice(0,SEARCH_LIST_LIMIT+1).map(i=>i.id).join(',')])expect(()=>parseTrackedIds(raw,allItems)).toThrow();});
 it('adds to an individual comparison list without mutating another list or the tracking catalog',()=>{const alice:number[]=[],bob:number[]=[],before=allItems.length,added=addSearchItem(alice,13444,allItems);expect(added).toEqual([13444]);expect(alice).toEqual([]);expect(bob).toEqual([]);expect(allItems).toHaveLength(before);expect(addSearchItem(added,13444,allItems)).toBe(added);expect(()=>addSearchItem([],999999999,allItems)).toThrow();});
});
