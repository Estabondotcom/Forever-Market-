'use client';
import {useEffect,useMemo,useState,type Dispatch,type SetStateAction} from 'react';
import {ArrowDownUp,ArrowUpRight,Fish,Info,Layers,Leaf,Package,RefreshCw,Search,Shirt,Sprout,X} from 'lucide-react';
import {allItems,categories,catalogFor,categoryLabels,isMarketCategory,type MarketCategory} from '@/lib/catalog';
import {formatNumber,formatTime} from '@/lib/market';
import {defaultSelection,formatHourly,hourlyDemand,itemColors,toggleMetric,type Metric,type Selection} from '@/lib/comparison';
import type {MarketData} from '@/lib/types';
import {money} from '@/lib/currency';
import {demoMarket} from '@/lib/demo';
import {useCollector} from '@/hooks/useCollector';
import {collectedHistories,collectedMarket,demandCoverage,itemDemandStatus} from '@/lib/collector-comparison';
import {useHistories} from '@/hooks/useHistories';
import ComparisonChart from './ComparisonChart';
import SearchPicker from './SearchPicker';
import {addSearchItem} from '@/lib/search';
import {renewalDelay,MIN_RETRY} from '@/lib/refresh-policy';
import {dailyTimeline,type TimelinePeriod} from '@/lib/timeline';
const EMPTY_SNAPSHOTS:MarketData['snapshots']=[];
const icons={cloth:Shirt,fish:Fish,herbs:Leaf,ore:Package,skinning:Layers};
const collectorLabels:Record<string,string>={warming:'First snapshot saved; waiting for the next update',collecting:'Recording demand trend',unchanged:'No new snapshot yet',gap:'Gap detected; waiting for comparable snapshots','collection-error':'Collection failed; retrying later','history-unavailable':'Saved history unavailable','http-401':'Blizzard credentials rejected','http-403':'Blizzard access denied','http-429':'Blizzard rate limit; waiting to retry'};
export default function Dashboard({demoOnly=false}:{demoOnly?:boolean}){
  const [category,setCategory]=useState<MarketCategory|'search'>('cloth'),[demo,setDemo]=useState(demoOnly),[about,setAbout]=useState(false);
  const [searchIds,setSearchIds]=useState<number[]>([]),[searchSelection,setSearchSelection]=useState<Selection>({});
  const searchItems=useMemo(()=>searchIds.map(id=>allItems.find(item=>item.id===id)!),[searchIds]);
  function addItem(id:number){setSearchIds(current=>addSearchItem(current,id,allItems));setSearchSelection(current=>({...current,[id]:{price:true,demand:true}}));}
  function removeItem(id:number){setSearchIds(current=>current.filter(value=>value!==id));setSearchSelection(current=>{const next={...current};delete next[id];return next;});}
  function clearSearch(){setSearchIds([]);setSearchSelection({});}
  useEffect(()=>{if(demoOnly)return;try{const value=localStorage.getItem('forever-farmers-market-category');if(value&&isMarketCategory(value))setCategory(value);}catch{}},[demoOnly]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setAbout(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  function choose(value:MarketCategory|'search'){setCategory(value);if(!demoOnly&&value!=='search')try{localStorage.setItem('forever-farmers-market-category',value);}catch{}}
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href={demoOnly?'./':'/'}><span className="brand-icon"><Sprout size={25}/></span><span><b>Forever:</b> Farmer’s Market<small>YOUR PERSONAL AUCTION HOUSE LEDGER</small></span></a><div className="header-right"><span className="market-pill"><span className="status-dot"/> US · Normal · Horde</span><button className="icon-button" aria-label="About estimated demand" onClick={()=>setAbout(true)}><Info size={19}/></button></div></header>
    <main><div className="page-intro"><div className="eyebrow">WATCH THE MARKET. PICK YOUR HARVEST.</div><h1>Compare the goods.<br className="mobile-break"/> Know the demand.</h1><p>Farmed resources, crafted goods, current prices, and estimated hourly demand.</p></div>
      {demo&&<div className="notice demo-notice" role="status"><Info size={17}/><span><b>{demoOnly?'INTERACTIVE MOCKUP':'DEMO MODE'}</b> · All prices, demand and history are synthetic samples, not live AH data.</span>{!demoOnly&&<button onClick={()=>setDemo(false)}>Return to live</button>}</div>}
      <nav className="category-tabs" aria-label="Resource sections">{categories.map(c=>{const Icon=icons[c];return <button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>choose(c)}><Icon size={16}/>{categoryLabels[c]}<span>{catalogFor(c).length}</span></button>;})}<button className={category==='search'?'active':''} aria-pressed={category==='search'} onClick={()=>choose('search')}><Search size={16}/>Search</button></nav>
      {category==='search'&&<SearchPicker catalog={allItems} ids={searchIds} onAdd={addItem} onClear={clearSearch}/>}
      <ResourceMarket key={`${category}-${demo}`} category={category} demo={demo} searchItems={searchItems} searchSelection={searchSelection} setSearchSelection={setSearchSelection} onRemoveSearchItem={removeItem}/>

      <footer><span>Forever: Farmer’s Market · forever.normal.horde.us</span><div><a href="https://ahledger.com" target="_blank" rel="noreferrer">AHledger <ArrowUpRight size={12}/></a><a href="https://develop.battle.net/" target="_blank" rel="noreferrer">Blizzard data <ArrowUpRight size={12}/></a>{demoOnly?<a href="https://github.com/Estabondotcom/Forever-Market-#readme">Run the live app ↗</a>:<button onClick={()=>setDemo(v=>!v)}>{demo?'Exit demo':'Try labeled demo'}</button>}</div></footer>
    </main>
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="about-panel" role="dialog" aria-modal="true" aria-label="About prices and hourly demand" onClick={e=>e.stopPropagation()}><button autoFocus className="icon-button close-button" aria-label="Close information" onClick={()=>setAbout(false)}><X/></button><div className="eyebrow">KNOW YOUR DATA</div><h2>Demand is an estimate.</h2><p>When your collector has saved observations, rows use that Blizzard dataset and the graph combines provider price history with saved Blizzard demand intervals. The page checks local demand observations every 15 minutes. Historical prices also come from AHledger and are renewed quietly within that provider’s permitted cache lifetime. Before the first saved snapshot, AHledger provides fallback data within its permitted cache lifetime.</p><p>AHledger estimates units sold per day from auction observations. We divide that estimate by 24 to show <b>average estimated units sold per hour</b>. This is not a measurement of purchases during the last hour. Cancellations can resemble purchases.</p><p>History and comparison share one graph with <b>72 hourly points for 3 days or daily points for 7 or 30 calendar days</b>, including today, in UTC. Each item has a consistent neon color. Solid lines show the lowest observed buyout per hour or day; dotted lines show historical estimated hourly demand only when supplied.</p><p>An optional server collector records Blizzard commodity snapshots for up to 30 days. The dotted trend uses reductions in listing quantities, normalized by elapsed hours. This proxy includes possible cancellations and expirations, misses trades between scans, and cannot confirm purchases. Gaps over two hours are not converted to hourly sales. No character or seller information is saved. House 114 is community-mapped to US Normal Horde.</p><p>AHledger currently supplies price history but no historical sales-rate series. Without the collector, the live graph leaves past demand blank and shows only the current rolling demand estimate at today’s endpoint. This is not a past daily purchase measurement. Sample mode uses explicit synthetic daily demand history to preview the combined layout.</p><p>Hourly and daily prices are the minimum of the supplied lowest-buyout observations for that UTC bucket. Missing days remain gaps, not zero prices. The current day is incomplete. Item toggles affect this same timeline; there is no separate snapshot chart.</p><p>The Search tab looks only through the curated tracking catalog. Its comparison list belongs to this browser page, stays while you switch tabs, and clears on reload. Your comparison-list preference is kept only in this page’s memory. Adding a search result enables its price and demand; remove it or clear the list at any time.</p><p>Farming-tab comparisons reset when you change tabs. The five farming lists focus on direct resources and exclude incidental catches and byproducts. Search additionally includes curated crafting reagents such as enchanting materials, stones and dyes. Rare standalone resources such as Black Lotus and Truesilver Ore remain because they are gathered directly.</p><p>Current prices are asking prices, not guaranteed proceeds. Missing prices and demand remain unavailable. Cached answers expire according to provider terms; demo values never replace failed live requests.</p><a className="source-link" href="https://ahledger.com/developers" target="_blank" rel="noreferrer">AHledger API documentation and terms ↗</a></section></div>}
  </div>;
}
function ResourceMarket({category,demo,searchItems,searchSelection,setSearchSelection,onRemoveSearchItem}:{category:MarketCategory|'search';demo:boolean;searchItems:typeof allItems;searchSelection:Selection;setSearchSelection:Dispatch<SetStateAction<Selection>>;onRemoveSearchItem:(id:number)=>void}){
  const isSearch=category==='search',label=isSearch?'Search':categoryLabels[category];
  const items=useMemo(()=>isSearch?searchItems:catalogFor(category as MarketCategory),[category,isSearch,searchItems]);
  const [providerData,setData]=useState<MarketData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[retryAt,setRetryAt]=useState(0),[clock,setClock]=useState(()=>Date.now()),[marketRefresh,setMarketRefresh]=useState(0);
  const [tabSelection,setTabSelection]=useState(()=>defaultSelection(items)),[query,setQuery]=useState(''),[sort,setSort]=useState<'name'|'price'|'demand'>('name'),[ascending,setAscending]=useState(true),[range,setRange]=useState<TimelinePeriod>('7d');
  const selection=isSearch?searchSelection:tabSelection,setSelection=isSearch?setSearchSelection:setTabSelection;
  const itemKey=items.map(i=>i.id).join(',');
  const marketQuery=isSearch?`items=${itemKey}`:`category=${category}`;
  const {data:collector,error:collectorError}=useCollector(category,demo,refresh,isSearch?itemKey:undefined);
  const localMarket=useMemo(()=>collectedMarket(items,collector),[items,collector]);
  const localPrimary=!!localMarket;
  const data=localMarket?.market??providerData;
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!items.length){setData(null);setLoading(false);setError('');return;}
    if(localPrimary){setData(null);setLoading(false);setError('');return;}
    const controller=new AbortController();let active=true;let renewal:ReturnType<typeof setTimeout>,retryDelay=MIN_RETRY;
    setLoading(true);
    if(demo){setData(demoMarket(items));setError('');setLoading(false);return;}
    (async()=>{try{
      const response=await fetch(`/api/market?${marketQuery}&revalidate=1`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;
      const delay=Number(response.headers.get('Retry-After')??60);retryDelay=Math.max(MIN_RETRY,(Number.isFinite(delay)?delay:60)*1000);setRetryAt(Date.now()+retryDelay);
      if(!response.ok)throw new Error(body.error??'Market unavailable');
      const lifetime=Date.parse(body.expiresAt)-Date.now();if(!Number.isFinite(lifetime)||lifetime<=0)throw new Error('Provider cache expired or invalid. Refresh for new data.');
      setData(body);setError('');renewal=setTimeout(()=>setMarketRefresh(v=>v+1),renewalDelay(lifetime));
    }catch(e){if(active){setError(e instanceof Error?e.message:'Market unavailable');setRetryAt(old=>Math.max(old,Date.now()+60000));setData(old=>old&&Date.parse(old.expiresAt)>Date.now()?old:null);renewal=setTimeout(()=>setMarketRefresh(v=>v+1),retryDelay);}}
    finally{if(active)setLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(renewal);};
  },[category,items,demo,refresh,marketRefresh,localPrimary,marketQuery]);
  // Market expiration is independent from renewal: never clear a still-permitted snapshot.
  useEffect(()=>{
    if(!providerData||demo)return;const deadline=Date.parse(providerData.expiresAt);
    const timer=setTimeout(()=>setData(current=>current&&Date.parse(current.expiresAt)<=Date.now()?null:current),Math.max(1,deadline-Date.now()));
    return()=>clearTimeout(timer);
  },[providerData,demo]);
  const selectedIds=items.filter(i=>selection[i.id]?.price||selection[i.id]?.demand).map(i=>i.id);
  const {histories:providerHistories,errors:historyErrors,loading:historyLoading}=useHistories(selectedIds,range==='3d'?'7d':range,true,demo,refresh);
  const histories=useMemo(()=>collectedHistories(items,providerHistories,collector,range==='3d'?'7d':range,Date.now()),[items,providerHistories,collector,range,localPrimary]);
  const localTurnover=!!collector?.enabled;
  const coverage=useMemo(()=>demandCoverage(items,collector),[items,collector]);
  const snapshots=data?.snapshots??EMPTY_SNAPSHOTS,byId=new Map(snapshots.map(s=>[s.itemId,s]));
  const selected=items.filter(i=>selection[i.id]?.price||selection[i.id]?.demand),selectedCount=selected.length;
  const demandFor=(id:number)=>localPrimary?localMarket!.demand.get(id)??null:hourlyDemand(byId.get(id)?.sales.estimatedPerDay);
  const visible=items.filter(i=>`${i.name} ${i.id}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==='name')return (ascending?1:-1)*a.name.localeCompare(b.name);
    const av=sort==='price'?byId.get(a.id)?.minBuyout:demandFor(a.id),bv=sort==='price'?byId.get(b.id)?.minBuyout:demandFor(b.id);
    if(av==null)return bv==null?0:1;if(bv==null)return -1;return (ascending?1:-1)*(av-bv);
  });
  const latest=snapshots.map(s=>s.observedAt).filter((s):s is string=>!!s).sort().at(-1),wait=Math.max(0,Math.ceil((retryAt-clock)/1000));
  const can30=demo||!!data?.historyRanges?.includes('30d')||!!collector?.samples.length;
  const {currentDemandIds,missingDemandIds}=useMemo(()=>dailyTimeline(items,snapshots,selection,histories,range),[items,snapshots,selection,histories,range]);
  function changeSort(key:typeof sort){if(sort===key)setAscending(v=>!v);else{setSort(key);setAscending(key==='name');}}
  function toggle(id:number,metric:Metric){setSelection(old=>toggleMetric(old,items,id,metric));}
  return <>
    {items.length>0&&<div className="market-toolbar"><div className="market-status"><span className={`status-dot ${!data?'offline':data.stale?'old':''}`}/><b>{demo?'Sample data':localPrimary?(data?.stale?'Older Blizzard observations':'Saved Blizzard snapshot'):data?(data.stale?'Older observations present':'Live AHledger market'):loading?'Connecting…':'Market unavailable'}</b><span>{demo?'Sample timestamp':'Latest actual observation'}: {formatTime(latest)}</span>{localPrimary&&<span>Snapshot checks: every 15 minutes</span>}</div><button className="refresh-button" disabled={loading&&!localPrimary||!demo&&wait>0} onClick={()=>{setRetryAt(Date.now()+60000);setRefresh(v=>v+1);}}><RefreshCw size={14} className={loading?'spin':''}/>{loading&&!localPrimary?'Refreshing…':!demo&&wait>0?`Wait ${wait}s`:'Refresh now'}</button></div>}
    {error&&!localPrimary&&<div className="notice error-notice" role="alert"><Info size={16}/>{error} No sample prices are substituted.</div>}
    {!demo&&items.length>0&&<div className="notice" role="status"><Info size={15}/><span>{!collector?(collectorError?'Collector status unavailable.':'Checking saved collector observations…'):!collector.enabled?'Hourly trend collector not started.':`${collectorLabels[collector.status]??'Waiting for collection'} · Latest snapshot: ${formatTime(collector.lastObservation)}${collector.stale?' · Waiting for a fresh update':''}${collector.nextCheck?` · Next check: ${formatTime(collector.nextCheck)}`:''}.`} {localTurnover?'Graph demand uses commodity-listing disappearance as estimated turnover. Cancellations and expirations can look like sales. Checks run every 15 minutes; unchanged snapshots and long gaps do not create demand points.':'AHledger provides the current rolling demand estimate; it does not provide past hourly sales.'}</span></div>}
    {collectorError&&<p className="history-error" role="status">{collectorError}</p>}
    <div className="resource-layout">
      <section className="resource-panel"><div className="resource-heading"><div><div className="eyebrow">{isSearch?'SEARCH COMPARISONS':`${label.toUpperCase()} RESOURCES`}</div><h2>Your comparison list <span>{items.length}</span></h2></div><button className="graph-jump" onClick={()=>document.getElementById('comparison-graph')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>View graph ↓</button></div>
        {!isSearch&&<label className="search-field"><Search size={15}/><input aria-label="Search current section" placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={13}/></button>}</label>}
        <div className="resource-list"><table><thead><tr><th><button onClick={()=>changeSort('name')}>Item <ArrowDownUp size={10}/></button></th><th><button onClick={()=>changeSort('price')}>AH price <ArrowDownUp size={10}/></button><small>solid line</small></th><th><button onClick={()=>changeSort('demand')}>{localPrimary?'Est. turnover / hr':'Est. sold / hr'} <ArrowDownUp size={10}/></button><small>dotted line</small></th></tr></thead><tbody>{visible.map(item=>{const snapshot=byId.get(item.id),flags=selection[item.id],color=itemColors[items.findIndex(i=>i.id===item.id)%itemColors.length];return <tr key={item.id} className={flags?.price||flags?.demand?'selected-row':''}><td><span className="resource-name"><i style={{background:color,boxShadow:`0 0 9px ${color}44`}}/>{item.name}</span><small className="item-id">#{item.id}{snapshot?.observedAt&&clock-Date.parse(snapshot.observedAt)>7200000?' · old observation':''}</small>{isSearch&&<button className="remove-search-item" aria-label={`Remove ${item.name} from search list`} onClick={()=>onRemoveSearchItem(item.id)}><X size={11}/>Remove</button>}</td><td><div className="metric-cell price"><span>{money(snapshot?.minBuyout)}</span><MetricToggle item={item.name} metric="price" checked={!!flags?.price} toggle={()=>toggle(item.id,'price')}/></div></td><td><div className="metric-cell demand"><span>{formatHourly(demandFor(item.id))}{!demo&&localTurnover&&demandFor(item.id)===null&&<small className="item-id">{itemDemandStatus(item.id,collector)}</small>}</span><MetricToggle item={item.name} metric="demand" checked={!!flags?.demand} toggle={()=>toggle(item.id,'demand')}/></div></td></tr>;})}</tbody></table></div>
        {!visible.length&&<div className="small-empty">{isSearch?'Search above and add an item to begin comparing.':'No matching resources.'}</div>}
        <div className="list-footer"><span>{selectedCount} items selected · {label} only</span><button onClick={()=>setSelection({})}>{isSearch?'Hide all lines':'Clear all'}</button></div>
      </section>
      <section className="chart-panel" id="comparison-graph"><div className="chart-top"><div><div className="eyebrow">HISTORY & COMPARISON</div><h2>Your market, over time.</h2></div><span className="selected-pill">{selectedCount} selected</span></div>
        <div className="timeline-toolbar"><span>{range==='3d'?'Hourly':'Daily'} points · UTC</span><div className="range-controls" aria-label="Timeline period">{(['3d','7d','30d'] as const).map(period=><button key={period} aria-pressed={range===period} disabled={period==='30d'&&!can30} className={range===period?'active':''} onClick={()=>setRange(period)}>{period==='3d'?'3 days · hourly':period==='7d'?'7 days':'30 days'}</button>)}</div></div>
        <div className="chart-legend"><span className="cyan-key">Price · solid line</span><span className="pink-key dotted-key">Demand · dotted line</span><small>One color per item</small></div>
        <div className="history-legend">{items.map((item,index)=>selection[item.id]?.price||selection[item.id]?.demand?<span key={item.id}><i style={{background:itemColors[index%itemColors.length]}}/>{item.name}</span>:null)}</div>
        <p className="history-status steady-history-status" role="status">{historyLoading?<><RefreshCw size={12} className="spin"/> Updating price history in the background…</>:demo?'Sample history':Object.values(histories).some(h=>h.priceSource==='ahledger')?'Price history: AHledger · Demand history: saved Blizzard intervals':'Showing available locally collected history'}</p>
        <ComparisonChart items={items} snapshots={snapshots} selection={selection} histories={histories} period={range} loading={historyLoading&&!localPrimary}/>
        {!demo&&!localTurnover&&(currentDemandIds.length>0||missingDemandIds.length>0)&&<div className="history-data-note"><Info size={14}/><span><b>Historical demand is not supplied by AHledger.</b> {currentDemandIds.length?'Only the current rolling estimate is plotted at the current endpoint; earlier periods stay blank.':'Demand stays blank until an estimate is available.'} No past sales are invented.</span></div>}
        <div className="chart-caption">{range==='3d'?'72 hourly points · Hourly lowest observed buyout · Current hour is partial':`${range==='7d'?'7':'30'} calendar days, including today · Daily lowest observed buyout · Current day is partial`} · Demand axis: est. units/hour</div>
        {localTurnover&&<p className="history-data-note">{coverage.intervals?`Saved demand: ${coverage.intervals} measured intervals, beginning ${formatTime(coverage.firstInterval)}. `:`No saved demand intervals yet (${coverage.snapshots} distinct snapshot${coverage.snapshots===1?'':'s'} recorded). `}Dotted history: estimated commodity turnover/hour between snapshot versions, not confirmed purchases. At least two distinct snapshots are needed. Daily points are weighted by observed interval duration. {localPrimary?'Current rows use your saved Blizzard observations. Older price history comes from AHledger; saved demand intervals remain independent.':'Rows show AHledger’s separate rolling sales estimate.'} {Object.values(histories).some(h=>h.priceSource==='blizzard-local')?'Local observations fill in when provider price history is unavailable.':''}</p>}
        {Object.entries(historyErrors).filter(([id])=>!(histories[Number(id)]?.priceSource==='blizzard-local'&&histories[Number(id)].series.some(p=>p.minBuyout!==null))).map(([id,message])=><p className="history-error" key={id}>{items.find(i=>i.id===Number(id))?.name}: {message}</p>)}
        <div className="selection-chips">{selected.map(item=><span key={item.id}><b>{item.name}</b><small>{selection[item.id].price?'Price':''}{selection[item.id].price&&selection[item.id].demand?' + ':''}{selection[item.id].demand?'Demand':''}</small><button aria-label={`Remove ${item.name} from comparison`} onClick={()=>setSelection(old=>{const next={...old};delete next[item.id];return next;})}><X size={12}/></button></span>)}</div>
      </section>
    </div>
    <div className="demand-note"><Info size={15}/><span><b>{localPrimary?'Demand = estimated commodity turnover per elapsed hour.':'Hourly demand = AHledger’s estimated daily sales ÷ 24.'}</b> {localPrimary?'Cancellations and expirations can resemble purchases; this is not confirmed sales.':'It is an average, not confirmed purchases in the last hour.'} Missing estimates remain unavailable. Comparisons reset when you change tabs.</span></div>
  </>;
}
function MetricToggle({item,metric,checked,toggle}:{item:string;metric:Metric;checked:boolean;toggle:()=>void}){
  return <button type="button" role="switch" aria-checked={checked} aria-label={`Compare ${item} ${metric}`} title={`${checked?'Hide':'Show'} ${item} ${metric}`} className={`metric-toggle ${metric} ${checked?'on':''}`} onClick={toggle}><span/></button>;
}
