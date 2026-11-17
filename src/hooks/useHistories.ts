'use client';
import {useEffect,useState} from 'react';
import type {HistoryData} from '@/lib/types';
import {demoHistory} from '@/lib/demo';
export function useHistories(ids:number[],range:string,enabled:boolean,demo:boolean,refresh:number){
  const key=ids.slice().sort((a,b)=>a-b).join(',');
  const [histories,setHistories]=useState<Record<number,HistoryData>>({}),[errors,setErrors]=useState<Record<number,string>>({}),[loading,setLoading]=useState(false),[expired,setExpired]=useState(0);
  useEffect(()=>{
    const itemIds=key?key.split(',').map(Number):[];
    setHistories({});setErrors({});setLoading(false);
    if(!enabled||!itemIds.length)return;
    if(demo){setHistories(Object.fromEntries(itemIds.map(id=>[id,{itemId:id,series:demoHistory(id,range),range,expiresAt:new Date(Date.now()+300000).toISOString(),latest:null,sales:null}])));return;}
    const controller=new AbortController(),timers:ReturnType<typeof setTimeout>[]=[];let active=true,cursor=0;
    setLoading(true);
    async function worker(){while(active&&cursor<itemIds.length){const id=itemIds[cursor++];try{
      const response=await fetch(`/api/history?itemId=${id}&range=${range}`,{cache:'no-store',signal:controller.signal});const data=await response.json();if(!active)return;
      if(!response.ok)throw new Error(data.error??'History unavailable');
      if(data.itemId!==id||data.range!==range)throw new Error('History item or range mismatch');
      const lifetime=Date.parse(data.expiresAt)-Date.now();if(lifetime<=0)throw new Error('History expired; refresh to request new observations');
      setHistories(old=>({...old,[id]:data}));
      timers.push(setTimeout(()=>{setHistories(old=>{const next={...old};delete next[id];return next;});setExpired(v=>v+1);},lifetime));
    }catch(error){if(active)setErrors(old=>({...old,[id]:error instanceof Error?error.message:'History unavailable'}));}}}
    void Promise.all([worker(),worker()]).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();timers.forEach(clearTimeout);};
  },[key,range,enabled,demo,expired,refresh]);
  // Avoid showing a prior tab/period's responses while the next effect starts.
  const allowed=new Set(ids);
  return {histories:Object.fromEntries(Object.entries(histories).filter(([id,h])=>allowed.has(Number(id))&&h.range===range)),errors,loading};
}
