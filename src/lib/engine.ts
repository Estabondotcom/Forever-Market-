import type { AuctionSnapshot,Fish,FishingCatch,FishingLocation,ProfitabilityResult,Settings } from './types';
import { settingsSchema } from './settings';
import { projectRevenue } from './revenue';
export function effectiveSkill(s:Settings){return s.baseSkill+s.equipmentBonus+s.lureBonus;}
// Independent implementation of the Classic server rule. Not proven for Forever.
export function successChance(skill:number,base:number|null){if(!Number.isFinite(skill)||skill<0)throw new Error('Invalid skill');if(base===null)return null;return skill<Math.max(1,base)?0:Math.min(1,Math.max(0,(skill-base+5)/100));}
export function activeCatch(c:FishingCatch,s:Settings,date:Date){return !s.seasonal || ((!c.months||c.months.includes(date.getUTCMonth()+1))&&(!c.hours||c.hours.includes(date.getUTCHours())));}
export function validateDistribution(catches:FishingCatch[]){for(const c of catches)if(c.probability!==null&&(!Number.isFinite(c.probability)||c.probability<0||c.probability>1))throw new Error('Invalid catch probability');return catches.every(c=>c.probability!==null);}
// Only use this for an exhaustive, mutually exclusive catch table. Bonus rolls need not sum to one.
export function normalizeProbabilities(weights:number[]){if(weights.some(x=>!Number.isFinite(x)||x<0))throw new Error('Invalid weights');const sum=weights.reduce((a,b)=>a+b,0);if(sum===0)throw new Error('Empty distribution');return weights.map(x=>x/sum);}
export function selectedPrice(a:AuctionSnapshot|undefined,strategy:Settings['priceStrategy']){if(!a||a.minBuyout===null||a.quantity===0)return null; if(strategy==='current')return a.minBuyout;if(strategy==='typical')return a.median7d;return a.median7d===null?null:Math.min(a.minBuyout,a.median7d);}
export const netPrice=(price:number,cut:number)=>{if(!Number.isFinite(price)||price<0||!Number.isFinite(cut)||cut<0||cut>1)throw new Error('Invalid price or cut');return Math.floor(price*(1-cut));};
export function supplyDays(quantity:number|null,demand:number|null){if([quantity,demand].some(v=>v!==null&&(!Number.isFinite(v)||v<0)))throw new Error('Invalid supply or demand');return quantity===null||demand===null?null:demand===0?(quantity===0?0:Infinity):quantity/demand;}
export function marketWarnings(a:AuctionSnapshot|undefined,now:Date){if(!a)return ['Missing market data'];const w:string[]=[];const sales=a.sales.estimatedPerDay;if(sales===null)w.push('Estimated daily sales unavailable');else if(sales<10)w.push('Very low estimated daily sales');if((supplyDays(a.quantity,sales)??0)>7)w.push('More than seven days of supply');if(a.sales.coveredHours==null)w.push('Sales sample coverage unavailable in summary');if(a.sales.coveredHours!=null&&a.sales.coveredHours<48)w.push('Low sample confidence');if(a.observedAt===null||now.getTime()-Date.parse(a.observedAt)>2*3600000)w.push('Old auction observation');if(a.minBuyout!=null&&a.median7d!=null){if(a.minBuyout>2*a.median7d)w.push('Price spike versus seven-day median');if(a.minBuyout<.7*a.median7d)w.push('Price substantially below typical; may be falling');}return w;}
export function evaluateLocation(location:FishingLocation,fish:Fish[],snapshots:AuctionSnapshot[],settings:Settings,date=new Date()):ProfitabilityResult{
 const s=settingsSchema.parse(settings);for(const a of snapshots){for(const value of [a.minBuyout,a.median,a.median7d,a.median30d,a.quantity,a.auctions,a.sales.estimatedPerDay])if(value!==null&&(!Number.isFinite(value)||value<0))throw new Error('Invalid market input');}validateDistribution(location.catches);const success=successChance(effectiveSkill(s),location.baseThreshold);let complete=location.distributionComplete&&success!==null;const warnings:string[]=[];
 if(success===0)warnings.push('Insufficient effective Fishing skill');if(!s.seasonal)warnings.push('Seasonal restrictions disabled: counterfactual estimate');
 const contributions=location.catches.filter(c=>activeCatch(c,s,date)).map(c=>{
 const f=fish.find(f=>f.id===c.itemId),a=snapshots.find(a=>a.itemId===c.itemId),rate=c.probability===null||success===null?null:3600/s.secondsPerAttempt*success*c.probability;
 const usedPrice=selectedPrice(a,s.priceStrategy),net=usedPrice===null?null:netPrice(usedPrice,s.ahCut),vendor=f?.vendorCopper??null,demand=a?.sales.estimatedPerDay??null,w=marketWarnings(a,date);
 const projection=rate===null?null:projectRevenue({unitsPerHour:rate,priceCopper:usedPrice,vendorCopper:vendor,estimatedSalesPerDay:demand,sessionHours:s.sessionHours,ahCut:s.ahCut,marketShare:s.marketShare});
 const auctionUnits=projection?.auctionUnits??null,vendorUnits=projection?.vendorUnits??null,revenuePerHour=projection?.revenuePerHour??null;
 w.push(...(projection?.warnings??[]));
 if(revenuePerHour===null)complete=false;
 return {itemId:c.itemId,probability:c.probability,catchesPerHour:rate,usedPrice,auctionUnits,vendorUnits,grossPerHour:rate===null||net===null?null:rate*net,revenuePerHour,daysOfSupply:supplyDays(a?.quantity??null,demand),warnings:w};});
 const adjusted=contributions.reduce((sum,c)=>sum+(c.revenuePerHour??0),0),gross=contributions.reduce((sum,c)=>sum+(c.grossPerHour??0),0);
 if(contributions.some(c=>c.grossPerHour===null))warnings.push('Gross AH potential is a partial subtotal');
 if(!complete)warnings.push('Incomplete estimate: subtotal excludes unknown revenue');
 return {location,successProbability:success,catchesPerHour:success===null?null:3600/s.secondsPerAttempt*success,grossPerHour:Math.round(gross),adjustedPerHour:Math.round(adjusted),sessionRevenue:Math.round(adjusted*s.sessionHours),confidence:complete?location.confidence:'incomplete',rankable:complete&&success!==0,contributions,warnings};
}
export function rankLocations(results:ProfitabilityResult[]){return [...results].sort((a,b)=>Number(b.rankable)-Number(a.rankable)||b.adjustedPerHour-a.adjustedPerHour||a.location.id.localeCompare(b.location.id));}
