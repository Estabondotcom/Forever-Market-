'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,ArrowDownUp,ArrowUpRight,Fish,Info,Layers,Leaf,LineChart,Package,RefreshCw,Search,Shirt,Sprout,X} from 'lucide-react';
import {categories,catalogFor,categoryLabels,isMarketCategory,type MarketCategory} from '@/lib/catalog';
import {formatNumber,formatTime} from '@/lib/market';
import {comparisonRows,defaultSelection,formatHourly,hourlyDemand,itemColors,toggleMetric,type Metric} from '@/lib/comparison';
import type {MarketData} from '@/lib/types';
import {money} from '@/lib/currency';
import {demoMarket} from '@/lib/demo';
import {useHistories} from '@/hooks/useHistories';
import {SnapshotComparison,PriceHistoryComparison} from './ComparisonChart';
const icons={cloth:Shirt,fish:Fish,herbs:Leaf,ore:Package,skinning:Layers};
export default function Dashboard({demoOnly=false}:{demoOnly?:boolean}){
  const [category,setCategory]=useState<MarketCategory>('cloth'),[demo,setDemo]=useState(demoOnly),[about,setAbout]=useState(false);
  useEffect(()=>{if(demoOnly)return;try{const value=localStorage.getItem('forever-farmers-market-category');if(value&&isMarketCategory(value))setCategory(value);}catch{}},[demoOnly]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setAbout(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  function choose(value:MarketCategory){setCategory(value);if(!demoOnly)try{localStorage.setItem('forever-farmers-market-category',value);}catch{}}
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href={demoOnly?'./':'/'}><span className="brand-icon"><Sprout size={25}/></span><span><b>Forever:</b> Farmer’s Market<small>YOUR PERSONAL AUCTION HOUSE LEDGER</small></span></a><div className="header-right"><span className="market-pill"><span className="status-dot"/> US · Normal · Horde</span><button className="icon-button" aria-label="About estimated demand" onClick={()=>setAbout(true)}><Info size={19}/></button></div></header>
    <main><div className="page-intro"><div className="eyebrow">WATCH THE MARKET. PICK YOUR HARVEST.</div><h1>Compare the goods.<br className="mobile-break"/> Know the demand.</h1><p>Primary resources, current AH prices, and estimated units sold per hour.</p></div>
      {demo&&<div className="notice demo-notice" role="status"><Info size={17}/><span><b>{demoOnly?'INTERACTIVE MOCKUP':'DEMO MODE'}</b> · All prices, demand and history are synthetic samples, not live AH data.</span>{!demoOnly&&<button onClick={()=>setDemo(false)}>Return to live</button>}</div>}
      <nav className="category-tabs" aria-label="Resource sections">{categories.map(c=>{const Icon=icons[c];return <button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>choose(c)}><Icon size={16}/>{categoryLabels[c]}<span>{catalogFor(c).length}</span></button>;})}</nav>
      <ResourceMarket key={`${category}-${demo}`} category={category} demo={demo}/>
      <footer><span>Forever: Farmer’s Market · forever.normal.horde.us</span><div><a href="https://ahledger.com" target="_blank" rel="noreferrer">Prices from AHledger <ArrowUpRight size={12}/></a>{demoOnly?<a href="https://github.com/Estabondotcom/Forever-Market-#readme">Run the live app ↗</a>:<button onClick={()=>setDemo(v=>!v)}>{demo?'Exit demo':'Try labeled demo'}</button>}</div></footer>
    </main>
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="about-panel" role="dialog" aria-modal="true" aria-label="About prices and hourly demand" onClick={e=>e.stopPropagation()}><button autoFocus className="icon-button close-button" aria-label="Close information" onClick={()=>setAbout(false)}><X/></button><div className="eyebrow">KNOW YOUR DATA</div><h2>Hourly demand is an average.</h2><p>AHledger estimates units sold per day from auction observations. We divide that estimate by 24 to show <b>average estimated units sold per hour</b>. This is not a measurement of purchases during the last hour. Cancellations can resemble purchases.</p><p>The Market comparison chart uses <b>items on the horizontal axis</b>. A dotted magenta line shows current estimated hourly demand; the solid cyan line compares current lowest buyout per item. The two vertical axes have separate units. Turn either metric on or off beside each item.</p><p>The Price history view compares actual price observations over time for the enabled price toggles. Historical purchase-volume data is not supplied, so no demand history is invented. A separate range is never fabricated when the provider cannot supply it.</p><p>Comparisons are limited to the active tab and reset when you change tabs. Catalogs focus on direct resources. Chests, bloated/trophy fish, hides, gems, stones and incidental herbal byproducts are excluded. Rare standalone resources such as Black Lotus and Truesilver Ore remain because they are gathered directly.</p><p>Current prices are asking prices, not guaranteed proceeds. Missing prices and demand remain unavailable. Cached answers expire according to provider terms; demo values never replace failed live requests.</p><a className="source-link" href="https://ahledger.com/developers" target="_blank" rel="noreferrer">AHledger API documentation and terms ↗</a></section></div>}
  </div>;
}
function ResourceMarket({category,demo}:{category:MarketCategory;demo:boolean}){
  const items=useMemo(()=>catalogFor(category),[category]);
  const [data,setData]=useState<MarketData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[retryAt,setRetryAt]=useState(0),[clock,setClock]=useState(()=>Date.now());
  const [selection,setSelection]=useState(()=>defaultSelection(items)),[query,setQuery]=useState(''),[sort,setSort]=useState<'name'|'price'|'demand'>('name'),[ascending,setAscending]=useState(true),[view,setView]=useState<'comparison'|'history'>('comparison'),[range,setRange]=useState('7d');
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;let expiration:ReturnType<typeof setTimeout>;
    setLoading(true);setError('');
    if(demo){setData(demoMarket(items));setLoading(false);return;}
    (async()=>{try{
      const response=await fetch(`/api/market?category=${category}`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;
      const delay=Number(response.headers.get('Retry-After')??60);setRetryAt(Date.now()+(Number.isFinite(delay)?delay:60)*1000);
      if(!response.ok)throw new Error(body.error??'Market unavailable');
      const lifetime=Date.parse(body.expiresAt)-Date.now();if(lifetime<=0)throw new Error('Provider cache expired. Refresh for new data.');
      setData(body);expiration=setTimeout(()=>{setData(null);setRefresh(v=>v+1);},lifetime);
    }catch(e){if(active){setError(e instanceof Error?e.message:'Market unavailable');setRetryAt(old=>Math.max(old,Date.now()+60000));setData(old=>old&&Date.parse(old.expiresAt)>Date.now()?old:null);}}
    finally{if(active)setLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(expiration);};
  },[category,items,demo,refresh]);
  const priceIds=items.filter(i=>selection[i.id]?.price).map(i=>i.id);
  const {histories,errors:historyErrors,loading:historyLoading}=useHistories(priceIds,range,view==='history',demo,refresh);
  const snapshots=data?.snapshots??[],byId=new Map(snapshots.map(s=>[s.itemId,s]));
  const selected=items.filter(i=>selection[i.id]?.price||selection[i.id]?.demand),selectedCount=selected.length;
  const visible=items.filter(i=>`${i.name} ${i.id}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==='name')return (ascending?1:-1)*a.name.localeCompare(b.name);
    const av=sort==='price'?byId.get(a.id)?.minBuyout:hourlyDemand(byId.get(a.id)?.sales.estimatedPerDay),bv=sort==='price'?byId.get(b.id)?.minBuyout:hourlyDemand(byId.get(b.id)?.sales.estimatedPerDay);
    if(av==null)return bv==null?0:1;if(bv==null)return -1;return (ascending?1:-1)*(av-bv);
  });
  const latest=snapshots.map(s=>s.observedAt).filter((s):s is string=>!!s).sort().at(-1),wait=Math.max(0,Math.ceil((retryAt-clock)/1000));
  const can30=demo||!!data?.historyRanges?.includes('30d');
  const plotted=comparisonRows(items,snapshots,selection),hasValue=plotted.some(p=>p.price!==null||p.demand!==null);
  function changeSort(key:typeof sort){if(sort===key)setAscending(v=>!v);else{setSort(key);setAscending(key==='name');}}
  function toggle(id:number,metric:Metric){setSelection(old=>toggleMetric(old,items,id,metric));}
  return <>
    <div className="market-toolbar"><div className="market-status"><span className={`status-dot ${!data?'offline':data.stale?'old':''}`}/><b>{demo?'Sample data':data?(data.stale?'Older observations present':'Live AHledger market'):loading?'Connecting…':'Market unavailable'}</b><span>{demo?'Sample timestamp':'Latest actual observation'}: {formatTime(latest)}</span></div><button className="refresh-button" disabled={loading||!demo&&wait>0} onClick={()=>setRefresh(v=>v+1)}><RefreshCw size={14} className={loading?'spin':''}/>{loading?'Refreshing…':!demo&&wait>0?`Refresh in ${wait}s`:'Refresh prices'}</button></div>
    {error&&<div className="notice error-notice" role="alert"><Info size={16}/>{error} No sample prices are substituted.</div>}
    <div className="resource-layout">
      <section className="resource-panel"><div className="resource-heading"><div><div className="eyebrow">{categoryLabels[category].toUpperCase()} RESOURCES</div><h2>Your comparison list <span>{items.length}</span></h2></div><button className="graph-jump" onClick={()=>document.getElementById('comparison-graph')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>View graph ↓</button></div>
        <label className="search-field"><Search size={15}/><input aria-label="Search current section" placeholder={`Search ${categoryLabels[category].toLowerCase()}…`} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={13}/></button>}</label>
        <div className="resource-list"><table><thead><tr><th><button onClick={()=>changeSort('name')}>Item <ArrowDownUp size={10}/></button></th><th><button onClick={()=>changeSort('price')}>AH price <ArrowDownUp size={10}/></button><small>solid line</small></th><th><button onClick={()=>changeSort('demand')}>Est. sold / hr <ArrowDownUp size={10}/></button><small>dotted line</small></th></tr></thead><tbody>{visible.map(item=>{const snapshot=byId.get(item.id),flags=selection[item.id],color=itemColors[items.findIndex(i=>i.id===item.id)%itemColors.length];return <tr key={item.id} className={flags?.price||flags?.demand?'selected-row':''}><td><span className="resource-name"><i style={{background:color,boxShadow:`0 0 9px ${color}44`}}/>{item.name}</span><small className="item-id">#{item.id}{snapshot?.observedAt&&clock-Date.parse(snapshot.observedAt)>7200000?' · old observation':''}</small></td><td><div className="metric-cell price"><span>{money(snapshot?.minBuyout)}</span><MetricToggle item={item.name} metric="price" checked={!!flags?.price} toggle={()=>toggle(item.id,'price')}/></div></td><td><div className="metric-cell demand"><span>{formatHourly(hourlyDemand(snapshot?.sales.estimatedPerDay))}</span><MetricToggle item={item.name} metric="demand" checked={!!flags?.demand} toggle={()=>toggle(item.id,'demand')}/></div></td></tr>;})}</tbody></table></div>
        {!visible.length&&<div className="small-empty">No matching resources.</div>}
        <div className="list-footer"><span>{selectedCount} items selected · {categoryLabels[category]} only</span><button onClick={()=>setSelection({})}>Clear all</button></div>
      </section>
      <section className="chart-panel" id="comparison-graph"><div className="chart-top"><div><div className="eyebrow">COMPARE YOUR MARKET</div><h2>{view==='comparison'?'Price meets demand.':'Watch prices over time.'}</h2></div><span className="selected-pill">{selectedCount} selected</span></div>
        <div className="chart-view-tabs"><button className={view==='comparison'?'active':''} onClick={()=>setView('comparison')}><Activity size={14}/> Market comparison</button><button className={view==='history'?'active':''} onClick={()=>setView('history')}><LineChart size={14}/> Price history</button>{view==='history'&&<div className="range-controls">{['24h','7d','30d'].map(p=><button key={p} aria-pressed={range===p} disabled={p==='30d'&&!can30} className={range===p?'active':''} onClick={()=>setRange(p)}>{p.toUpperCase()}</button>)}</div>}</div>
        {view==='comparison'?<><div className="chart-legend"><span className="cyan-key">Current AH price · solid line</span><span className="pink-key dotted-key">Est. sold/hour · dotted line</span></div>{!data&&selectedCount?<div className="chart-empty">{loading?'Loading current market data…':'Live comparison data unavailable.'}</div>:selectedCount&&!hasValue?<div className="chart-empty">No price or demand observations supplied for these items.</div>:<SnapshotComparison items={items} snapshots={snapshots} selection={selection}/>}<div className="chart-caption">Items on the horizontal axis · Price on the left · Estimated units/hour on the right</div></>:<><div className="history-legend">{items.map((item,index)=>selection[item.id]?.price?<span key={item.id}><i style={{background:itemColors[index%itemColors.length]}}/>{item.name}</span>:null)}</div>{historyLoading&&<p className="history-status"><RefreshCw size={12} className="spin"/> Loading selected price histories…</p>}<PriceHistoryComparison items={items} selection={selection} histories={histories}/><div className="chart-caption">Actual observation timestamps · Lowest buyout per item · No demand history is invented</div>{Object.entries(historyErrors).map(([id,message])=><p className="history-error" key={id}>{items.find(i=>i.id===Number(id))?.name}: {message}</p>)}</>}
        <div className="selection-chips">{selected.map(item=><span key={item.id}><b>{item.name}</b><small>{selection[item.id].price?'Price':''}{selection[item.id].price&&selection[item.id].demand?' + ':''}{selection[item.id].demand?'Demand':''}</small><button aria-label={`Remove ${item.name} from comparison`} onClick={()=>setSelection(old=>{const next={...old};delete next[item.id];return next;})}><X size={12}/></button></span>)}</div>
      </section>
    </div>
    <div className="demand-note"><Info size={15}/><span><b>Hourly demand = AHledger’s estimated daily sales ÷ 24.</b> It is an average, not confirmed purchases in the last hour. Missing estimates remain unavailable. Comparisons reset when you change tabs.</span></div>
  </>;
}
function MetricToggle({item,metric,checked,toggle}:{item:string;metric:Metric;checked:boolean;toggle:()=>void}){
  return <button type="button" role="switch" aria-checked={checked} aria-label={`Compare ${item} ${metric}`} title={`${checked?'Hide':'Show'} ${item} ${metric}`} className={`metric-toggle ${metric} ${checked?'on':''}`} onClick={toggle}><span/></button>;
}
