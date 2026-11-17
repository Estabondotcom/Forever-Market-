import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Forever Market — AH Prices & Demand',description:'Current WoW Forever US Normal Horde auction prices, neon price history graphs and estimated sales demand for fish, cloth, leather, ore and herbs.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
