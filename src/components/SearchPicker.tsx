'use client';
import {useId,useMemo,useState} from 'react';
import {Search,X} from 'lucide-react';
import type {CatalogItem} from '@/lib/types';
import {searchCatalog,SEARCH_LIST_LIMIT} from '@/lib/search';
export default function SearchPicker({catalog,ids,onAdd,onClear}:{catalog:CatalogItem[];ids:number[];onAdd:(id:number)=>void;onClear:()=>void}){
 const [query,setQuery]=useState(''),[active,setActive]=useState(0),[open,setOpen]=useState(false),id=useId();
 const results=useMemo(()=>searchCatalog(catalog,query,ids),[catalog,query,ids]),full=ids.length>=SEARCH_LIST_LIMIT;
 const expanded=open&&query.trim().length>=2&&!full;
 function choose(itemId:number){onAdd(itemId);setQuery('');setActive(0);setOpen(false);}
 return <section className="search-picker" aria-label="Find items to compare">
  <div className="search-picker-heading"><div><div className="eyebrow">YOUR TEMPORARY COMPARISON LIST</div><h2>Find an item. Add it to compare.</h2><p>Local to this browser tab. Clears on page reload.</p></div><button className="refresh-button" disabled={!ids.length} onClick={onClear}><X size={13}/>Clear list</button></div>
  <div className="autocomplete-wrap"><label htmlFor={id}>Search tracked items by name or item ID</label><div className="search-field"><Search size={16}/><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-results`} aria-activedescendant={expanded&&results[active]?`${id}-${results[active].id}`:undefined} autoComplete="off" placeholder="Try mana potion, enchanting dust, or thorium…" value={query} disabled={full} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onChange={e=>{setQuery(e.target.value);setActive(0);setOpen(true);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);return;}if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setActive(index=>Math.min(index+1,Math.max(0,results.length-1)));}if(e.key==='ArrowUp'){e.preventDefault();setActive(index=>Math.max(0,index-1));}if(e.key==='Enter'&&expanded&&results[active]){e.preventDefault();choose(results[active].id);}}}/></div>
  {expanded&&<div className="autocomplete-results" id={`${id}-results`} role="listbox" aria-label="Matching tracked items">{results.length?results.map((item,index)=><button key={item.id} id={`${id}-${item.id}`} role="option" aria-selected={index===active} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(item.id)}><span>{item.name}<small>#{item.id}</small></span><b>Add +</b></button>):<p>No matching tracked items, or this item is already in your list.</p>}</div>}
  </div><small>{full?`Your list has ${SEARCH_LIST_LIMIT} items. Remove one to add another.`:`Searches ${catalog.length} curated resources, consumables and reagents · ${ids.length}/${SEARCH_LIST_LIMIT} in your list`}</small>
 </section>;
}
