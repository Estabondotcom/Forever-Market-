/** Shared selling model for fishing and user-measured material harvests. Prices are copper. */
export interface RevenueInput {
  unitsPerHour: number;
  priceCopper: number | null;
  vendorCopper: number | null;
  estimatedSalesPerDay: number | null;
  sessionHours: number;
  ahCut: number;
  marketShare: number;
}
export function projectRevenue(input: RevenueInput) {
  const {unitsPerHour,priceCopper,vendorCopper,estimatedSalesPerDay,sessionHours,ahCut,marketShare}=input;
  for(const value of [unitsPerHour,priceCopper,vendorCopper,estimatedSalesPerDay]) {
    if(value!==null&&(!Number.isFinite(value)||value<0))throw new Error('Invalid revenue input');
  }
  if(!Number.isFinite(sessionHours)||sessionHours<=0||![ahCut,marketShare].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new Error('Invalid session, fee or market share');
  const net=priceCopper===null?null:Math.floor(priceCopper*(1-ahCut));
  const count=unitsPerHour*sessionHours;
  const warnings:string[]=[];
  let auctionUnits:number|null=null,vendorUnits:number|null=null,revenuePerHour:number|null=null;
  if(count===0){auctionUnits=0;vendorUnits=0;revenuePerHour=0;}
  else if(vendorCopper!==null&&(net===null||vendorCopper>=net)){
    auctionUnits=0;vendorUnits=count;revenuePerHour=unitsPerHour*vendorCopper;
    if(net===null)warnings.push('No usable auction price; vendor-only lower bound');
  }else if(net!==null&&estimatedSalesPerDay!==null){
    auctionUnits=Math.min(count,estimatedSalesPerDay*marketShare);vendorUnits=count-auctionUnits;
    if(vendorUnits<1e-9||vendorCopper!==null)revenuePerHour=(auctionUnits*net+vendorUnits*(vendorCopper??0))/sessionHours;
    else warnings.push('Vendor value unknown for excess output');
  }else warnings.push('Selling capacity unknown');
  return {auctionUnits,vendorUnits,revenuePerHour,grossPerHour:net===null?null:unitsPerHour*net,warnings};
}
