export const MARKET = 'forever.normal.horde.us' as const;
export interface CatalogItem { id:number; name:string; metadataVerified:boolean; source:string }
export interface SalesEstimate { estimatedPerDay:number|null; windowDays?:number|null; coveredHours?:number|null }
export interface AuctionSnapshot {
  itemId:number; minBuyout:number|null; median:number|null; median7d:number|null; median30d:number|null;
  quantity:number|null; auctions:number|null; observedAt:string|null; sales:SalesEstimate; source:string; url:string;
}
export interface PriceHistoryPoint { timestamp:string; minBuyout:number|null; median:number|null; quantity:number|null; estimatedSalesPerDay?:number|null; estimatedTurnoverPerHour?:number|null; intervalHours?:number|null }
export interface MarketData {
  market:typeof MARKET; snapshots:AuctionSnapshot[]; fetchedAt:string; expiresAt:string;
  stale:boolean; historyRanges?:string[]; error?:string; demo?:boolean;
}
export interface HistoryData {
  turnoverSource?:boolean; priceSource?:'ahledger'|'blizzard-local';
  itemId:number; series:PriceHistoryPoint[]; range:string; expiresAt:string;
  sales:SalesEstimate|null;
  latest:{observedAt:string;source:string;minBuyout:number|null;median:number|null;quantity:number|null;auctions:number|null;median7d?:number|null;median30d?:number|null}|null;
}

export interface CollectorSample {itemId:number;timestamp:string;minBuyout:number|null;quantity:number;estimatedTurnoverPerHour:number|null;intervalHours:number|null}
export interface CollectorData {enabled:boolean;status:string;market:typeof MARKET;houseId:114;lastCheck:string|null;nextCheck:string|null;lastObservation:string|null;stale:boolean;samples:CollectorSample[]}
