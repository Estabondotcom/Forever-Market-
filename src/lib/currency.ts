export function currencyParts(copper:number){ if(!Number.isFinite(copper)) throw new Error('Invalid currency'); const n=Math.round(Math.abs(copper));return {negative:copper<0,gold:Math.floor(n/10000),silver:Math.floor(n%10000/100),copper:n%100}; }
export function money(copper:number|null|undefined){if(copper==null || !Number.isFinite(copper))return 'Unknown';const p=currencyParts(copper);return `${p.negative?'-':''}${p.gold}g ${p.silver}s ${p.copper}c`;}
export const fromCurrency=(gold:number,silver=0,copper=0)=>Math.round(gold*10000+silver*100+copper);
