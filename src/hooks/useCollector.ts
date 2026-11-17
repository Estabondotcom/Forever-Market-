'use client';
import {useEffect,useState} from 'react';
import {MARKET,type CollectorData} from '../lib/types';
import {HOUR,collectorDeadline,pruneCollector} from '../lib/refresh-policy';
export function useCollector(category:string,demo:boolean,refresh:number,itemKey?:string){
 const requestKey=itemKey===undefined?`category=${category}`:`items=${itemKey}`;
 const context=`${category}:${demo}`;
 const [state,setState]=useState<{context:string;data:CollectorData|null;error:string}>({context,data:null,error:''});
 useEffect(()=>{
  if(demo||itemKey===''){setState({context,data:null,error:''});return;}
  const controller=new AbortController();let active=true,busy=false;
  async function load(){
   if(busy)return;busy=true;
   try{
    const r=await fetch(`/api/collector?${requestKey}`,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error();
    const body=await r.json();if(body.market!==MARKET||body.houseId!==114||!Array.isArray(body.samples))throw new Error();
    if(active)setState({context,data:pruneCollector(body),error:''});
   }catch{if(active)setState(old=>({context,data:old.context===context&&old.data?pruneCollector(old.data):null,error:'Collector update unavailable; retrying on the next hourly check. Saved observations remain visible.'}));}
   finally{busy=false;}
  }
  void load();const timer=setInterval(()=>void load(),HOUR);
  return()=>{active=false;controller.abort();clearInterval(timer);};
 },[category,demo,refresh,context,requestKey,itemKey]);
 const data=state.context===context?state.data:null;
 useEffect(()=>{
  if(!data)return;const deadline=collectorDeadline(data);if(!Number.isFinite(deadline))return;
  let timer:ReturnType<typeof setTimeout>;
  function schedule(){timer=setTimeout(()=>{if(Date.now()<deadline)schedule();else setState(old=>old.data?{...old,data:pruneCollector(old.data)}:old);},Math.min(2147483647,Math.max(1,deadline-Date.now())));}
  schedule();return()=>clearTimeout(timer);
 },[data]);
 return {data,error:state.context===context?state.error:''};
}
