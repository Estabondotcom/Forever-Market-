import { spawn } from 'node:child_process';
// Accept the managed preview CLI's Vite-style flags while running normal Next.js.
const input=process.argv.slice(2),args=['dev','--webpack'];
for(let i=0;i<input.length;i++){if(input[i]==='--strictPort')continue;if(input[i]==='--host'){args.push('--hostname',input[++i]);}else args.push(input[i]);}
if(!args.includes('--hostname'))args.push('--hostname','0.0.0.0');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',...args],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??0));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
