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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16 pt-8">
          <Header />
          <main>{children}</main>
        </div>
        <HelpFab />
      </body>
    </html>
  );
}
