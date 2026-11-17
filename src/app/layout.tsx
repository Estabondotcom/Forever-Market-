import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Forever: Farmer’s Market',description:'Compare current WoW Forever US Normal Horde prices and estimated hourly demand for cloth, fish, herbs, ore and skinning resources.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
