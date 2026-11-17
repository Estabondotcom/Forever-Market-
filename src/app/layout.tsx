import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'WoW Forever Fishing Profit Tracker',description:'Fishing, cloth, leather, ore and herb market intelligence for US Normal Horde. Live AHledger prices, historical graphs and demand-aware returns.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
