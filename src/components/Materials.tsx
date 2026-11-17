'use client';
import {useEffect,useMemo,useState} from 'react';
import {RefreshCw,Search,X,Info,ArrowUpRight} from 'lucide-react';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,Legend} from 'recharts';
import materials from '@/data/materials.json';
import {categoryLabels,type MaterialCategory} from '@/lib/catalog';
import {marketWarnings,selectedPrice,supplyDays} from '@/lib/engine';
import {projectRevenue} from '@/lib/revenue';
import {money} from '@/lib/currency';
import {demoMarket,demoHistory} from '@/lib/demo';
import type {MarketData,Settings,PriceHistoryPoint} from '@/lib/types';

const number=(v:number|null|undefined)=>v==null?'Unknown':v===Infinity?'∞':v.toLocaleString(undefined,{maximumFractionDigits:1});
const when=(v:string|null|undefined)=>v?new Date(v).toLocaleString():'No observation';
const materialCategories:MaterialCategory[]=['cloth','leather','ore','herbs'];
type YieldPlan={label:string;rates:Record<string,number>};
const emptyPlan:YieldPlan={label:'',rates:{}};

export default function Materials({settings,demo}:{settings:Settings;demo:boolean}){
  const [category,setCategory]=useState<MaterialCategory>('cloth');
  return <section className="materials-section">
    <div className="material-category-tabs" aria-label="Material categories">{materialCategories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{categoryLabels[c]} <small>{materials.filter(i=>i.category===c).length}</small></button>)}</div>
    <MaterialMarket key={`${category}-${demo}`} category={category} settings={settings} demo={demo}/>
  </section>;
}
function MaterialMarket({category,settings,demo}:{category:MaterialCategory;settings:Settings;demo:boolean}){
  const items=useMemo(()=>materials.filter(i=>i.category===category),[category]);
  const [data,setData]=useState<MarketData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[retryAt,setRetryAt]=useState(0),[clock,setClock]=useState(()=>Date.now());
  const [query,setQuery]=useState(''),[sort,setSort]=useState('sales'),[ascending,setAscending]=useState(false),[plan,setPlan]=useState<YieldPlan>(emptyPlan),[ready,setReady]=useState(false),[selected,setSelected]=useState<number|null>(null),[range,setRange]=useState('7d'),[series,setSeries]=useState<PriceHistoryPoint[]>([]),[historyError,setHistoryError]=useState(''),[historyLoading,setHistoryLoading]=useState(false),[can30,setCan30]=useState(false);
  const storageKey=`forever-material-plan-${category}`;
  useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const parsed=JSON.parse(raw);const rates:Record<string,number>={};for(const item of items){const rate=parsed.rates?.[item.id];if(typeof rate==='number'&&Number.isFinite(rate)&&rate>=0&&rate<=100000)rates[item.id]=rate;}setPlan({label:typeof parsed.label==='string'?parsed.label.slice(0,100):'',rates});}}catch{}setReady(true);},[storageKey,items]);
  useEffect(()=>{if(ready)localStorage.setItem(storageKey,JSON.stringify(plan));},[plan,ready,storageKey]);
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();let expiration:ReturnType<typeof setTimeout>;
    setLoading(true);setError('');setData(null);
    if(demo){setData(demoMarket(items));setCan30(true);setLoading(false);return;}
    (async()=>{try{const response=await fetch(`/api/market?category=${category}`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;if(!response.ok){setRetryAt(Date.now()+Number(response.headers.get('Retry-After')??60)*1000);throw new Error(body.error??'Material market unavailable');}if(Date.parse(body.expiresAt)<=Date.now())throw new Error('Provider cache expired; retry for a fresh response');setData(body);setCan30(body.historyRanges?.includes('30d')??false);setRetryAt(Date.now()+60000);expiration=setTimeout(()=>{setData(null);setRefresh(n=>n+1);},Date.parse(body.expiresAt)-Date.now());}catch(e){if(active)setError(e instanceof Error?e.message:'Material market unavailable');}finally{if(active)setLoading(false);}})();
    return()=>{active=false;controller.abort();clearTimeout(expiration);};
  },[category,refresh,demo,items]);
  useEffect(()=>{
    setSeries([]);setHistoryError('');if(selected===null)return;let active=true;let expiration:ReturnType<typeof setTimeout>;const controller=new AbortController();setHistoryLoading(true);
    if(demo){setSeries(demoHistory(selected,range));setHistoryLoading(false);return;}
    (async()=>{try{const response=await fetch(`/api/history?itemId=${selected}&range=${range}`,{cache:'no-store',signal:controller.signal});const body=await response.json();if(!active)return;if(!response.ok){if(response.status===403&&range==='30d')setCan30(false);throw new Error(body.error??'History unavailable');}setSeries(body.series);expiration=setTimeout(()=>{setSeries([]);setHistoryError('History expired. Select another period to request fresh observations.');},Math.max(0,Date.parse(body.expiresAt)-Date.now()));}catch(e){if(active)setHistoryError(e instanceof Error?e.message:'History unavailable');}finally{if(active)setHistoryLoading(false);}})();return()=>{active=false;controller.abort();clearTimeout(expiration);};
  },[selected,range,demo]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setSelected(null);};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const rows=items.map(item=>{
    const snapshot=data?.snapshots.find(a=>a.itemId===item.id),price=selectedPrice(snapshot,settings.priceStrategy),rate=plan.rates[item.id];
    const projection=data&&rate!=null?projectRevenue({unitsPerHour:rate,priceCopper:price,vendorCopper:item.vendorCopper,estimatedSalesPerDay:snapshot?.sales.estimatedPerDay??null,sessionHours:settings.sessionHours,ahCut:settings.ahCut,marketShare:settings.marketShare}):null;
    return {item,snapshot,price,rate,projection,days:supplyDays(snapshot?.quantity??null,snapshot?.sales.estimatedPerDay??null)};
  });
  const activeRows=rows.filter(row=>(row.rate??0)>0),subtotal=activeRows.reduce((sum,row)=>sum+(row.projection?.revenuePerHour??0),0),incomplete=activeRows.some(row=>row.projection?.revenuePerHour==null),grossIncomplete=activeRows.some(row=>row.projection?.grossPerHour==null),gross=activeRows.reduce((sum,row)=>sum+(row.projection?.grossPerHour??0),0);
  const displayed=rows.filter(row=>row.item.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
    if(sort==='name')return (ascending?1:-1)*a.item.name.localeCompare(b.item.name);
    const value=(row:typeof a)=>sort==='price'?row.snapshot?.minBuyout:sort==='typical'?row.snapshot?.median7d:sort==='supply'?row.snapshot?.quantity:sort==='profit'?row.projection?.revenuePerHour:row.snapshot?.sales.estimatedPerDay;
    const av=value(a),bv=value(b);if(av==null)return bv==null?0:1;if(bv==null)return -1;return (ascending?1:-1)*(av-bv);
  });
  const sortBy=(key:string)=>{if(sort===key)setAscending(v=>!v);else{setSort(key);setAscending(key==='name');}};
  const detail=rows.find(row=>row.item.id===selected),latest=data?.snapshots.map(s=>s.observedAt).filter((s):s is string=>!!s).sort().at(-1),remaining=Math.max(0,Math.ceil((retryAt-clock)/1000));
  return <>
    <div className="material-heading"><div><div className="eyebrow">GATHERING & FARMING</div><h2>{categoryLabels[category]} market</h2><p>Real prices and estimated demand. Your own harvest rates.</p></div><button className="button" disabled={loading||remaining>0&&!demo} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15} className={loading?'spin':''}/>{loading?'Loading…':remaining>0&&!demo?`Refresh in ${remaining}s`:'Refresh materials'}</button></div>
    {error&&<div className="notice error" role="alert">{error}. No synthetic prices are substituted.</div>}
    <div className="model-note"><Info size={16}/><span>No verified Forever farming routes or drop/node rates are supplied. Enter <b>your expected units per hour</b> below. This is a user estimate, independent of Fishing skill, casting time or lure bonuses.</span></div>
    <section className="harvest-summary">
      <label>Farm / route label (optional)<input maxLength={100} placeholder="e.g. My one-hour mining route" value={plan.label} onChange={e=>setPlan({...plan,label:e.target.value})}/></label>
      <div><small>DEMAND-ADJUSTED / HOUR {incomplete?'· PARTIAL SUBTOTAL':''}</small><strong>{data&&activeRows.length?money(Math.round(subtotal)):'Enter your yields'}</strong><small>{activeRows.length} materials in plan · {settings.sessionHours}h session · {number(settings.marketShare*100)}% assumed share</small></div>
      <div><small>GROSS AH POTENTIAL / HOUR {grossIncomplete?'· PARTIAL':''}</small><strong>{data&&activeRows.length?money(Math.round(gross)):'—'}</strong><small>After {number(settings.ahCut*100)}% AH cut · {settings.priceStrategy} pricing</small></div>
      <button className="button subtle" onClick={()=>setPlan(emptyPlan)}>Clear yields</button>
    </section>
    <section className="data-panel"><div className="table-toolbar"><div><h3>{items.length} verified catalog items</h3><p>{demo?'SYNTHETIC DEMO':`Latest actual observation: ${when(latest)}`}{data?.stale?' · Old observations present':''}</p></div><label className="search"><Search size={15}/><input aria-label="Search materials" placeholder={`Search ${categoryLabels[category].toLowerCase()}…`} value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
    <div className="table-scroll"><table><thead><tr><th><button onClick={()=>sortBy('name')}>Material ↕</button></th><th><button onClick={()=>sortBy('price')}>Current price ↕</button></th><th><button onClick={()=>sortBy('typical')}>7-day median ↕</button></th><th>Price used</th><th><button onClick={()=>sortBy('supply')}>Supply ↕</button></th><th><button onClick={()=>sortBy('sales')}>Est. sales/day ↕</button></th><th>Days supply</th><th>Your units/hour</th><th><button onClick={()=>sortBy('profit')}>Adjusted / hour ↕</button></th></tr></thead><tbody>{displayed.map(row=><tr key={row.item.id}><td><button className="location-name" onClick={()=>{setSelected(row.item.id);setRange('7d');}}>{row.item.name}<small>#{row.item.id} · View history ↗</small></button></td><td className="currency">{money(row.snapshot?.minBuyout)}</td><td className="currency">{money(row.snapshot?.median7d)}</td><td className="currency">{money(row.price)}</td><td>{number(row.snapshot?.quantity)}</td><td>{number(row.snapshot?.sales.estimatedPerDay)}</td><td>{number(row.days)}</td><td><input className="yield-input" aria-label={`${row.item.name} units per hour`} type="number" min={0} max={100000} step="any" placeholder="Unknown" value={row.rate??''} onChange={e=>{const rates={...plan.rates};if(e.target.value==='')delete rates[row.item.id];else{const value=Number(e.target.value);if(!Number.isFinite(value)||value<0||value>100000)return;rates[row.item.id]=value;}setPlan({...plan,rates});}}/></td><td className="profit-cell"><span className="currency">{money(row.projection?.revenuePerHour==null?null:Math.round(row.projection.revenuePerHour))}</span><small>{row.rate==null?'Yield not supplied':row.projection?.revenuePerHour==null?'Incomplete':'User-estimated yield'}</small></td></tr>)}</tbody></table></div>{displayed.length===0&&<div className="empty-state">No matching materials.</div>}<div className="table-footer"><span>Click an item for history and selling breakdown.</span><a href="https://ahledger.com" target="_blank" rel="noreferrer">Prices from AHledger ↗</a></div></section>
    <p className="helper">Yields and route labels are saved only in this browser. The plan sums the items you enter, including secondary outputs. Daily selling capacity is not multiplied by session length. Deposits, relisting, travel, competition and gathering/kill time are excluded. Use the shared settings button for session length, fee, assumed share and price strategy.</p>
    {detail&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><section className="drawer" role="dialog" aria-modal="true" aria-label="Material details" onClick={e=>e.stopPropagation()}><button autoFocus className="close-button icon-button" aria-label="Close material details" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">{categoryLabels[category].toUpperCase()} · US NORMAL HORDE</div><h2>{detail.item.name}</h2><p>Verified item #{detail.item.id} · {demo?'SYNTHETIC DEMO':'AHledger market observations'}</p>
      <div className="detail-metrics">{[['Current lowest buyout',money(detail.snapshot?.minBuyout)],['Current median',money(detail.snapshot?.median)],['Seven-day median',money(detail.snapshot?.median7d)],['Thirty-day median',money(detail.snapshot?.median30d)],['Price used',money(detail.price)],['Verified vendor value',money(detail.item.vendorCopper)],['Estimated daily sales',number(detail.snapshot?.sales.estimatedPerDay)],['Current supply',number(detail.snapshot?.quantity)],['Days of supply',number(detail.days)],['Latest actual observation',when(detail.snapshot?.observedAt)]].map(([label,value])=><div key={label}><span>{label}</span><strong className="material-detail-value">{value}</strong></div>)}</div>
      <h3>Your selling breakdown</h3><p className="helper">{detail.rate==null?'Enter units/hour in the table to calculate a plan.':`${number(detail.rate)} units/hour for ${settings.sessionHours} hours. Assumed auction sales: ${number(detail.projection?.auctionUnits)} units. Vendor fallback: ${number(detail.projection?.vendorUnits)} units. Demand-adjusted/hour: ${money(detail.projection?.revenuePerHour==null?null:Math.round(detail.projection.revenuePerHour))}.`}</p>
      {[...marketWarnings(detail.snapshot,new Date()),...(detail.projection?.warnings??[])].map(w=><p className="inline-warning" key={w}><Info size={14}/>{w}</p>)}
      <div className="chart-header"><h3>Actual price history</h3><div className="range-controls">{['24h','7d','30d'].map(period=><button key={period} disabled={period==='30d'&&!can30} className={range===period?'active':''} onClick={()=>setRange(period)}>{period}</button>)}</div></div>
      {historyLoading?<div className="chart-empty">Loading observations…</div>:historyError?<div className="chart-empty" role="alert">{historyError}</div>:!series.length?<div className="chart-empty">No history supplied for this period.</div>:<div className="history-chart"><ResponsiveContainer width="100%" height={280}><LineChart data={series}><CartesianGrid stroke="var(--line)" vertical={false}/><XAxis dataKey="timestamp" tickFormatter={v=>new Date(v).toLocaleDateString()} minTickGap={50} tick={{fontSize:10,fill:'var(--muted)'}}/><YAxis width={75} tickFormatter={v=>money(v)} tick={{fontSize:9,fill:'var(--muted)'}}/><Tooltip labelFormatter={v=>when(String(v))} formatter={v=>money(typeof v==='number'?v:null)} contentStyle={{background:'var(--panel)',border:'1px solid var(--line)'}}/><Legend/><Line dataKey="minBuyout" name="Minimum buyout" stroke="#d5b575" dot={false} connectNulls={false}/><Line dataKey="median" name="Market median" stroke="#61b7a8" dot={false} connectNulls={false}/></LineChart></ResponsiveContainer></div>}
      <a className="source-link" href={detail.snapshot?.url??detail.item.source} target="_blank" rel="noreferrer">Prices from AHledger · View item <ArrowUpRight size={13}/></a>
    </section></div>}
  </>;
}
