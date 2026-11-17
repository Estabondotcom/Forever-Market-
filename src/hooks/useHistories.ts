'use client';
import {useEffect,useMemo,useState} from 'react';
import type {HistoryData} from '../lib/types';
import {demoHistory} from '../lib/demo';
import {HOUR,MIN_RETRY,historyDeadline,validHistories} from '../lib/refresh-policy';
export function useHistories(ids:number[],range:string,enabled:boolean,demo:boolean,refresh:number){
 const key=ids.slice().sort((a,b)=>a-b).join(','),context=`${range}:${demo}:${enabled}`;
 const [state,setState]=useState<{context:string;histories:Record<number,HistoryData>;errors:Record<number,string>;loading:boolean}>({context,histories:{},errors:{},loading:false});
 useEffect(()=>{
  const itemIds=key?key.split(',').map(Number):[];
  if(!enabled||!itemIds.length){setState({context,histories:{},errors:{},loading:false});return;}
  if(demo){setState({context,histories:Object.fromEntries(itemIds.map(id=>[id,{itemId:id,series:demoHistory(id,range),range,expiresAt:new Date(Date.now()+HOUR).toISOString(),latest:null,sales:null}])),errors:{},loading:false});return;}
  const controller=new AbortController(),timers=new Set<ReturnType<typeof setTimeout>>();let active=true,inflight=0;
  setState(old=>({context,histories:old.context===context?validHistories(old.histories,itemIds,range):{},errors:{},loading:true}));
  function later(id:number,delay:number,retry=false){if(!active)return;const timer=setTimeout(()=>{timers.delete(timer);void load(id);},Math.max(retry?MIN_RETRY:1000,delay));timers.add(timer);}
  async function load(id:number){
   if(!active)return;let retryDelay=HOUR;inflight++;setState(old=>({...old,loading:true}));
   try{
    const response=await fetch(`/api/history?itemId=${id}&range=${range}&revalidate=1`,{cache:'no-store',signal:controller.signal}),body=await response.json();if(!active)return;
    if(!response.ok){const retry=Number(response.headers.get('Retry-After'));if(Number.isFinite(retry)&&retry>0)retryDelay=retry*1000;throw new Error(body.error??'History unavailable');}
    if(body.itemId!==id||body.range!==range||!Array.isArray(body.series))throw new Error('History item or range mismatch');
    const lifetime=Date.parse(body.expiresAt)-Date.now();if(!Number.isFinite(lifetime)||lifetime<=0)throw new Error('Provider history expired; retrying later');
    setState(old=>{const errors={...old.errors};delete errors[id];return {...old,histories:{...old.histories,[id]:body},errors};});
    // A separate request for this item only; never re-run the whole selection effect.
    later(id,lifetime>15000?lifetime-Math.min(5000,lifetime/4):lifetime+250);
   }catch(error){if(active){later(id,retryDelay,true);setState(old=>({...old,errors:{...old.errors,[id]:error instanceof Error?error.message:'History unavailable'}}));}}
   finally{inflight--;if(active&&inflight===0)setState(old=>({...old,loading:false}));}
  }
  let cursor=0;
  async function worker(){while(active&&cursor<itemIds.length)await load(itemIds[cursor++]);}
  void Promise.all([worker(),worker()]);
  return()=>{active=false;controller.abort();timers.forEach(clearTimeout);};
 },[key,range,enabled,demo,refresh,context]);
 // Retention cleanup never starts network requests or clears unrelated lines/errors.
 useEffect(()=>{
  const deadline=historyDeadline(state.histories);if(!Number.isFinite(deadline))return;
  const timer=setTimeout(()=>setState(old=>({...old,histories:validHistories(old.histories,Object.keys(old.histories).map(Number),range)})),Math.max(1,deadline-Date.now()));
  return()=>clearTimeout(timer);
 },[state.histories,range]);
 const histories=useMemo(()=>{
  if(state.context!==context)return {};
  const allowed=new Set(key?key.split(',').map(Number):[]);
  return Object.fromEntries(Object.entries(state.histories).filter(([id,h])=>allowed.has(Number(id))&&h.range===range));
 },[state.histories,state.context,context,key,range]);
 const errors=useMemo(()=>{
  if(state.context!==context)return {};
  const allowed=new Set(key?key.split(',').map(Number):[]);
  return Object.fromEntries(Object.entries(state.errors).filter(([id])=>allowed.has(Number(id))));
 },[state.errors,state.context,context,key]);
 return {histories,errors,loading:state.context===context?state.loading:enabled&&!demo};
}
