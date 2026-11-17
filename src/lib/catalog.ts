import fish from '../data/fish.json';
import materials from '../data/materials.json';
export const categories=['fishing','cloth','leather','ore','herbs'] as const;
export type MarketCategory=typeof categories[number];
export type MaterialCategory=Exclude<MarketCategory,'fishing'>;
export const categoryLabels:Record<MarketCategory,string>={fishing:'Fish & catches',cloth:'Cloth',leather:'Leather & hides',ore:'Ore',herbs:'Herbs'};
export function isMarketCategory(value:string):value is MarketCategory{return (categories as readonly string[]).includes(value);}
export function catalogFor(category:MarketCategory){return category==='fishing'?fish:materials.filter(item=>item.category===category);}
export const allItems=[...fish,...materials];
