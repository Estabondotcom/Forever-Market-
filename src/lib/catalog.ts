import resources from '../data/resources.json';
import crafting from '../data/crafting-watchlist.json';
import type {CatalogItem} from './types';
export const categories=['cloth','fish','herbs','ore','skinning'] as const;
export type MarketCategory=typeof categories[number];
export const categoryLabels:Record<MarketCategory,string>={cloth:'Cloth',fish:'Fish',herbs:'Herbs',ore:'Ore',skinning:'Skinning'};
export function isMarketCategory(value:string):value is MarketCategory{return (categories as readonly string[]).includes(value);}
export function catalogFor(category:MarketCategory):CatalogItem[]{return resources.filter(item=>item.category===category);}
export const allItems:CatalogItem[]=[...resources,...crafting];
