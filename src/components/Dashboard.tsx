'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,ArrowDownUp,ArrowUpRight,Check,ChevronDown,Fish,Info,Layers,Leaf,Package,RefreshCw,Search,Shirt,X} from 'lucide-react';
import {categories,catalogFor,categoryLabels,isMarketCategory,type MarketCategory} from '@/lib/catalog';
import {marketRows,sortRows,daysOfSupply,marketWarnings,formatNumber,formatTime,type SortKey} from '@/lib/market';
import type {HistoryData,MarketData} from '@/lib/types';
import {money} from '@/lib/currency';
import {demoHistory,demoMarket} from '@/lib/demo';
import PriceChart from './PriceChart';
const icons={fishing:Fish,cloth:Shirt,leather:Layers,ore:Package,herbs:Leaf};
const periods=['24h','7d','30d'] as const;
const headers:[SortKey,string][]=[['name','Item'],['price','Lowest buyout'],['typical','7-day median'],['sales','Est. sold / day'],['supply','Units listed'],['days','Days of supply'],['trend','Vs. 7-day median']];

export default function Dashboard(){
  const [category,setCategory]=useState<MarketCategory>('fishing'),[demo,setDemo]=useState(false),[about,setAbout]=useState(false);
  useEffect(()=>{try{const stored=localStorage.getItem('forever-market-category');if(stored&&isMarketCategory(stored))setCategory(stored);}catch{}},[]);
  function chooseCategory(value:MarketCategory){setCategory(value);try{localStorage.setItem('forever-market-category',value);}catch{}}
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setAbout(false);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  return <div className="app-shell">
    <header className="topbar"><a href="/" className="brand"><span className="brand-icon"><Activity size={23}/></span><span>FOREVER<span className="brand-accent">MARKET</span><small>AUCTION HOUSE INTELLIGENCE</small></span></a><div className="header-right"><span className="market-pill"><span className="status-dot"/> US · Normal · Horde</span><button className="icon-button" aria-label="About market data and estimated demand" onClick={()=>setAbout(true)}><Info size={19}/></button></div></header>
    <main>
      <div className="page-intro"><div className="eyebrow">YOUR PERSONAL AUCTION LEDGER</div><h1>The market never sleeps.</h1><p>Current prices. Neon history. A clearer view of buyer demand.</p></div>
      {demo&&<div className="notice demo-notice" role="status"><Info size={17}/><span><b>DEMO MODE</b> — synthetic prices and sales estimates. These are not live market observations.</span><button onClick={()=>setDemo(false)}>Return to live</button></div>}
      <nav className="category-tabs" aria-label="Goods categories">{categories.map(c=>{const Icon=icons[c];return <button key={c} className={category===c?'active':''} aria-pressed={category===c} onClick={()=>chooseCategory(c)}><Icon size={16}/>{categoryLabels[c]}<span>{catalogFor(c).length}</span></button>;})}</nav>
      <MarketView key={`${category}-${demo}`} category={category} demo={demo}/>
      <footer><span>Fixed market · forever.normal.horde.us</span><div><a href="https://ahledger.com" target="_blank" rel="noreferrer">Prices from AHledger <ArrowUpRight size={12}/></a><button onClick={()=>setDemo(v=>!v)}>{demo?'Exit demo':'Try labeled demo'}</button></div></footer>
    </main>
    {about&&<div className="modal-backdrop" onClick={()=>setAbout(false)}><section className="about-panel" role="dialog" aria-modal="true" aria-label="About the market data" onClick={e=>e.stopPropagation()}><button autoFocus className="icon-button close-button" aria-label="Close market information" onClick={()=>setAbout(false)}><X/></button><div className="eyebrow">KNOW YOUR DATA</div><h2>Demand is an estimate.</h2><p>AHledger estimates units sold per day from auction observations. This is the closest available purchase-volume indicator here, but it is <b>not a record of confirmed purchases</b>: cancellations and other listing changes can resemble sales.</p><p>Units listed measures current supply. Days of supply is current listed units divided by estimated units sold per day. Missing sales estimates remain unavailable; estimated zero sales is shown as zero, with infinite days of supply if stock is listed.</p><p>Lowest buyout and market median are asking prices per item. The seven-day and thirty-day medians are historical summaries, not guaranteed sale prices. The table’s percentage compares current lowest buyout to the seven-day median; it is not a measured short-term price trend.</p><p>History contains only the points and periods supplied by AHledger. The supply graph measures listings, not purchases. No sales history is invented. Observation timestamps, sample coverage and missing data remain visible.</p><p>Responses are cached only for their allowed provider lifetime, then removed and refreshed. Expired data never becomes demo data. Only your selected category is saved in this browser; there are no accounts or price archives.</p><a className="source-link" href="https://ahledger.com/developers" target="_blank" rel="noreferrer">AHledger API documentation and terms ↗</a></section></div>}
  </div>;
}

function MarketView({category,demo}:{category:MarketCategory;demo:boolean}){
  const items=useMemo(()=>catalogFor(category),[category]);
  const [data,setData]=useState<MarketData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[retryAt,setRetryAt]=useState(0),[clock,setClock]=useState(()=>Date.now());
  const [selectedId,setSelectedId]=useState(category==='fishing'?13422:items[0].id),[range,setRange]=useState('7d'),[historyState,setHistory]=useState<HistoryData|null>(null),[historyLoading,setHistoryLoading]=useState(true),[historyError,setHistoryError]=useState(''),[historyRefresh,setHistoryRefresh]=useState(0),[historyRetryAt,setHistoryRetryAt]=useState(0),[denied30,setDenied30]=useState(false),[showSupply,setShowSupply]=useState(false);
  const history=historyState?.itemId===selectedId&&historyState.range===range?historyState:null;
  const [query,setQuery]=useState(''),[sort,setSort]=useState<SortKey>('sales'),[ascending,setAscending]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;let expiration:ReturnType<typeof setTimeout>;
    setLoading(true);setError('');
    if(demo){setData(demoMarket(items));setLoading(false);return;}
    (async()=>{try{
      const response=await fetch(`/api/market?category=${category}`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;
      const retry=Number(response.headers.get('Retry-After')??60);setRetryAt(Date.now()+(Number.isFinite(retry)?retry:60)*1000);
      if(!response.ok)throw new Error(body.error??'Market unavailable');
      if(Date.parse(body.expiresAt)<=Date.now())throw new Error('Provider cache expired. Request a fresh observation.');
      setData(body);expiration=setTimeout(()=>{setData(null);setRefresh(v=>v+1);},Date.parse(body.expiresAt)-Date.now());
    }catch(e){if(active){setError(e instanceof Error?e.message:'Market unavailable');setRetryAt(old=>Math.max(old,Date.now()+60000));setData(old=>old&&Date.parse(old.expiresAt)>Date.now()?old:null);}}
    finally{if(active)setLoading(false);}})();
    return()=>{active=false;controller.abort();clearTimeout(expiration);};
  },[category,demo,items,refresh]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;let expiration:ReturnType<typeof setTimeout>;
    setHistory(null);setHistoryError('');setHistoryLoading(true);
    if(demo){setHistory({itemId:selectedId,series:demoHistory(selectedId,range),range,expiresAt:new Date(Date.now()+300000).toISOString(),latest:null,sales:null});setHistoryLoading(false);return;}
    (async()=>{try{
      const response=await fetch(`/api/history?itemId=${selectedId}&range=${range}`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;
      if(!response.ok){const delay=Number(response.headers.get('Retry-After')??60);setHistoryRetryAt(Date.now()+(Number.isFinite(delay)?delay:60)*1000);if(response.status===403&&range==='30d')setDenied30(true);throw new Error(body.error??'History unavailable');}
      if(Date.parse(body.expiresAt)<=Date.now())throw new Error('History cache expired. Retry for fresh observations.');
      setHistory(body);expiration=setTimeout(()=>{setHistory(null);setHistoryRefresh(v=>v+1);},Date.parse(body.expiresAt)-Date.now());
    }catch(e){if(active){setHistoryError(e instanceof Error?e.message:'History unavailable');setHistoryRetryAt(old=>Math.max(old,Date.now()+60000));}}
    finally{if(active)setHistoryLoading(false);}})();
    return()=>{active=false;controller.abort();clearTimeout(expiration);};
  },[selectedId,range,demo,historyRefresh]);
  const rows=useMemo(()=>marketRows(items,data?.snapshots??[]),[items,data]);
  const displayed=useMemo(()=>sortRows(rows.filter(row=>`${row.item.name} ${row.item.id}`.toLowerCase().includes(query.toLowerCase())),sort,ascending),[rows,query,sort,ascending]);
  const selected=rows.find(row=>row.item.id===selectedId)??rows[0],snapshot=selected.snapshot;
  const sales=history?.sales??snapshot?.sales??null;
  const days=daysOfSupply(snapshot?.quantity??null,sales?.estimatedPerDay??null);
  const latest=data?.snapshots.map(s=>s.observedAt).filter((s):s is string=>!!s).sort().at(-1);
  const wait=Math.max(0,Math.ceil((retryAt-clock)/1000)),historyWait=Math.max(0,Math.ceil((historyRetryAt-clock)/1000));
  const can30=demo||!!data?.historyRanges?.includes('30d')&&!denied30;
  const hasPrices=history?.series.some(p=>p.minBuyout!==null||p.median!==null),hasSupply=history?.series.some(p=>p.quantity!==null);
  const warnings=marketWarnings(snapshot,sales);
  function sortBy(key:SortKey){if(sort===key)setAscending(v=>!v);else{setSort(key);setAscending(key==='name');}}
  function refreshAll(){setRefresh(v=>v+1);if(!historyLoading&&historyWait===0)setHistoryRefresh(v=>v+1);}
  return <>
    <div className="market-toolbar"><div className="market-status"><span className={`status-dot ${!data?'offline':data.stale?'old':''}`}/><b>{demo?'Synthetic demo':data?(data.stale?'Old observations present':'AHledger connected'):loading?'Connecting to AHledger':'Market unavailable'}</b><span className="observation">Latest actual observation: {formatTime(latest)}</span></div><button className="refresh-button" disabled={loading||!demo&&wait>0} onClick={refreshAll}><RefreshCw size={14} className={loading?'spin':''}/>{loading?'Refreshing…':!demo&&wait>0?`Refresh in ${wait}s`:'Refresh market'}</button></div>
    {error&&<div className="notice error-notice" role="alert"><Info size={17}/><span>{error} No invented prices are substituted.</span></div>}
    <div className="market-summary"><div><small>CATALOG ITEMS</small><strong>{items.length}</strong><span>{categoryLabels[category]}</span></div><div><small>WITH CURRENT PRICES</small><strong>{data?rows.filter(row=>row.snapshot?.minBuyout!=null).length:'—'}</strong><span>Actual auction observations</span></div><div><small>WITH SALES ESTIMATES</small><strong>{data?rows.filter(row=>row.snapshot?.sales.estimatedPerDay!=null).length:'—'}</strong><span>Inferred volume, not confirmed trades</span></div><div><small>MARKET</small><strong className="market-region">US <span>/</span> HORDE</strong><span>Forever · Normal (PvE)</span></div></div>
    <div className="chart-layout">
      <section className="chart-panel"><div className="panel-heading"><div><div className="eyebrow">PRICE HISTORY</div><h2>{selected.item.name}</h2><span className="item-id">ITEM #{selected.item.id} <span>·</span> {demo?'SYNTHETIC DEMO':'PER ITEM'}</span></div><div className="range-controls" aria-label="History period">{periods.map(period=><button key={period} className={range===period?'active':''} aria-pressed={range===period} disabled={period==='30d'&&!can30} title={period==='30d'&&!can30?'30-day access is unavailable or not yet confirmed':undefined} onClick={()=>setRange(period)}>{period==='24h'?'24H':period==='7d'?'7D':'30D'}</button>)}</div></div>
        <div className="chart-legend"><span className="cyan-key">Lowest buyout</span><span className="pink-key">Market median</span><span className="point-count">{formatNumber(history?.series.length??0)} supplied observations</span></div>
        {historyLoading?<div className="chart-empty"><RefreshCw size={22} className="spin"/><span>Loading market history…</span></div>:historyError?<div className="chart-empty" role="alert"><Info size={22}/><span>{historyError}</span><button className="refresh-button" disabled={historyWait>0} onClick={()=>setHistoryRefresh(v=>v+1)}>{historyWait?`Retry in ${historyWait}s`:'Retry history'}</button></div>:!hasPrices?<div className="chart-empty"><Activity size={25}/><span>No price history supplied for this period.</span></div>:<PriceChart series={history!.series}/>}
        <div className="chart-caption"><span>{demo?'Synthetic samples':history?.latest?.source?`Source: ${history.latest.source}`:'Source: AHledger'} · Exact timestamps and currency on hover/tap</span><label><input type="checkbox" checked={showSupply} onChange={e=>setShowSupply(e.target.checked)}/> Show listed supply</label></div>
        {showSupply&&<div className="supply-section"><div className="chart-legend"><span className="green-key">Units listed</span><span>Supply history · not purchase volume</span></div>{hasSupply?<PriceChart series={history!.series} supply/>:<div className="small-empty">No supply history supplied for this period.</div>}</div>}
      </section>
      <aside className="item-panel"><div className="eyebrow">CURRENT MARKET</div><small className="price-label">LOWEST BUYOUT / ITEM</small><div className="main-price">{snapshot?.minBuyout==null?<span className="unavailable">Unavailable</span>:<Currency value={snapshot.minBuyout}/>}</div><div className="median-comparison"><span>Current median</span><b>{money(snapshot?.median)}</b></div><div className="item-divider"/>
        <div className="demand-volume"><span className="green-key">ESTIMATED UNITS SOLD / DAY</span><strong>{formatNumber(sales?.estimatedPerDay)}</strong><small>Inferred purchase volume — not confirmed sales</small></div>
        <div className="metric-pair"><div><small>UNITS LISTED</small><strong>{formatNumber(snapshot?.quantity)}</strong></div><div><small>DAYS OF SUPPLY</small><strong>{formatNumber(days)}</strong></div></div>
        <dl className="item-facts"><div><dt>7-day median</dt><dd>{money(snapshot?.median7d)}</dd></div><div><dt>30-day median</dt><dd>{money(snapshot?.median30d)}</dd></div><div><dt>Active auctions</dt><dd>{formatNumber(history?.latest?.auctions??snapshot?.auctions)}</dd></div><div><dt>Sales sample window</dt><dd>{sales?.windowDays==null?'Unavailable':`${formatNumber(sales.windowDays)} days`}</dd></div><div><dt>Observed sample coverage</dt><dd>{sales?.coveredHours==null?'Unavailable':`${formatNumber(sales.coveredHours)} hours`}</dd></div></dl>
        <p className="observed-at">Price observed<br/><b>{formatTime(snapshot?.observedAt)}</b></p>
        <a className="item-source" href={snapshot?.url??selected.item.source} target="_blank" rel="noreferrer">View item on AHledger <ArrowUpRight size={13}/></a>
      </aside>
    </div>
    <div className="demand-note"><Info size={15}/><span><b>Demand follows estimated sales volume.</b> Auction cancellations can resemble purchases. {warnings.join(' ')}</span></div>
    <section className="table-panel"><div className="table-heading"><div><h2>{categoryLabels[category]} overview</h2><p>Select an item to inspect its neon price chart and demand.</p></div><label className="search-field"><Search size={16}/><input aria-label="Search goods by name or item ID" placeholder="Search goods or item ID…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</label></div>
      <div className="table-scroll"><table><thead><tr>{headers.map(([key,label])=><th key={key} aria-sort={sort===key?(ascending?'ascending':'descending'):'none'}><button onClick={()=>sortBy(key)}>{label}<ArrowDownUp size={10}/>{sort===key&&<span className="sort-direction">{ascending?'↑':'↓'}</span>}</button></th>)}</tr></thead><tbody>{displayed.map(row=><tr key={row.item.id} className={selectedId===row.item.id?'selected-row':''}><td><button className="item-select" aria-pressed={selectedId===row.item.id} onClick={()=>setSelectedId(row.item.id)}><span className="table-item-icon">{selectedId===row.item.id?<Check size={14}/>:<Layers size={14}/>}</span><span>{row.item.name}<small>#{row.item.id}{row.snapshot?.observedAt&&Date.now()-Date.parse(row.snapshot.observedAt)>7200000?' · Old observation':''}</small></span></button></td><td className="price-cell">{money(row.snapshot?.minBuyout)}</td><td>{money(row.snapshot?.median7d)}</td><td className="sales-cell">{formatNumber(row.snapshot?.sales.estimatedPerDay)}</td><td>{formatNumber(row.snapshot?.quantity)}</td><td>{formatNumber(row.days)}</td><td><span className={row.trend==null?'unavailable':row.trend>=0?'pink-text':'cyan-text'}>{row.trend==null?'Unavailable':`${row.trend>0?'+':''}${formatNumber(row.trend)}%`}</span></td></tr>)}</tbody></table></div>
      {!displayed.length&&<div className="small-empty">No matching goods. Try another name or item ID.</div>}
      <div className="table-footer"><span>{displayed.length} of {items.length} items · Unknown values stay unavailable</span><span>All prices per item · gold / silver / copper</span></div>
    </section>
  </>;
}
function Currency({value}:{value:number}){const copper=Math.round(value);return <>{Math.floor(copper/10000).toLocaleString()}<i>g</i> {Math.floor(copper%10000/100)}<i>s</i> {copper%100}<i>c</i></>;}
