import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import HelpFab from "@/components/HelpFab";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Simulador de Credito Venezolano",
  description: "Simulacion de credito UVC, IDI, mora y asientos contables.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        {/* Prevent flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
        <div className="flex w-full flex-col gap-6 px-4 pb-16 pt-6 md:px-6 xl:px-10">
          <Header />
          <main>{children}</main>
        </div>
        <HelpFab />
      </body>
    </html>
  );
}
