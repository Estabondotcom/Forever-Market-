export const MARKET = 'forever.normal.horde.us' as const;
export type DataConfidence = 'verified' | 'estimated' | 'incomplete';
export interface Fish { id:number; name:string; vendorCopper:number|null; metadataVerified:boolean; source:string }
export interface FishingCatch { itemId:number; probability:number|null; months?:number[]; hours?:number[]; basis?:string }
export interface FishingLocation { id:string; zone:string; area:string; mode:'open-water'|'school'; minimumSkill:number|null; baseThreshold:number|null; reliableSkill:number|null; catches:FishingCatch[]; confidence:DataConfidence; distributionComplete:boolean; source:string; notes:string[]; campEffect?:'rack'|'hut' }
export interface SalesEstimate { estimatedPerDay:number|null; windowDays?:number|null; coveredHours?:number|null }
export interface AuctionSnapshot { itemId:number; minBuyout:number|null; median:number|null; median7d:number|null; median30d:number|null; quantity:number|null; auctions:number|null; observedAt:string|null; sales:SalesEstimate; source:string; url:string }
export interface PriceHistoryPoint { timestamp:string; minBuyout:number|null; median:number|null; quantity:number|null }
export interface Settings { baseSkill:number; equipmentBonus:number; lureBonus:number; secondsPerAttempt:number; sessionHours:number; ahCut:number; marketShare:number; priceStrategy:'conservative'|'current'|'typical'; mode:'open-water'|'school'|'all'; seasonal:boolean; theme:'dark'|'light' }
export interface FishContribution { itemId:number; probability:number|null; catchesPerHour:number|null; usedPrice:number|null; auctionUnits:number|null; vendorUnits:number|null; grossPerHour:number|null; revenuePerHour:number|null; daysOfSupply:number|null; warnings:string[] }
export interface ProfitabilityResult { location:FishingLocation; successProbability:number|null; catchesPerHour:number|null; grossPerHour:number; adjustedPerHour:number; sessionRevenue:number; confidence:DataConfidence; rankable:boolean; contributions:FishContribution[]; warnings:string[] }
export interface MarketData { market:typeof MARKET; snapshots:AuctionSnapshot[]; fetchedAt:string; expiresAt:string; stale:boolean; historyRanges?:string[]; error?:string; demo?:boolean }
