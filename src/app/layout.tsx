import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'WoW Forever Fishing Profit Tracker',description:'Personal fishing market intelligence for US Normal Horde. Live AHledger prices, transparent catch estimates and demand-aware returns.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
