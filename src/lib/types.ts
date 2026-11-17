export const MARKET = 'forever.normal.horde.us' as const;
export interface CatalogItem { id:number; name:string; metadataVerified:boolean; source:string }
export interface SalesEstimate { estimatedPerDay:number|null; windowDays?:number|null; coveredHours?:number|null }
export interface AuctionSnapshot {
  itemId:number; minBuyout:number|null; median:number|null; median7d:number|null; median30d:number|null;
  quantity:number|null; auctions:number|null; observedAt:string|null; sales:SalesEstimate; source:string; url:string;
}
export interface PriceHistoryPoint { timestamp:string; minBuyout:number|null; median:number|null; quantity:number|null; estimatedSalesPerDay?:number|null }
export interface MarketData {
  market:typeof MARKET; snapshots:AuctionSnapshot[]; fetchedAt:string; expiresAt:string;
  stale:boolean; historyRanges?:string[]; error?:string; demo?:boolean;
}
export interface HistoryData {
  itemId:number; series:PriceHistoryPoint[]; range:string; expiresAt:string;
  sales:SalesEstimate|null;
  latest:{observedAt:string;source:string;minBuyout:number|null;median:number|null;quantity:number|null;auctions:number|null;median7d?:number|null;median30d?:number|null}|null;
}
