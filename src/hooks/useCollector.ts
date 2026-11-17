'use client';
import {useEffect,useState} from 'react';
import type {CollectorData} from '@/lib/types';
export function useCollector(category:string,demo:boolean,refresh:number){
 const [data,setData]=useState<CollectorData|null>(null);
 useEffect(()=>{
  setData(null);if(demo)return;
  const controller=new AbortController();let active=true;
  async function load(){try{const r=await fetch(`/api/collector?category=${category}`,{cache:'no-store',signal:controller.signal});if(!r.ok)throw new Error();const body=await r.json();if(active)setData(body);}catch{if(active)setData(null);}}
  void load();const timer=setInterval(()=>void load(),60000);
  return()=>{active=false;controller.abort();clearInterval(timer);};
 },[category,demo,refresh]);
 return data;
}
