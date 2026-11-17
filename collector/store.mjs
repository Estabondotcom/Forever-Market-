import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {emptyState,prune} from './model.mjs';
export async function loadState(directory,now=Date.now()){
 await mkdir(directory,{recursive:true});
 const path=resolve(directory,'history.json');
 await unlink(path+'.tmp').catch(error=>{if(error.code!=='ENOENT')throw error;});
 try{return prune(JSON.parse(await readFile(path,'utf8')),now);}catch(error){if(error.code==='ENOENT')return emptyState();throw new Error('Collector state unreadable or invalid; stopped to protect existing history.');}
}
export async function saveState(directory,state,now=Date.now()){
 prune(state,now);const path=resolve(directory,'history.json');
 await writeFile(path+'.tmp',JSON.stringify(state),{mode:0o600});await rename(path+'.tmp',path);
}
