import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sword Art Online — NerveGear System",
  description:
    "Sistema di login e creazione personaggio per il VRMMORPG Sword Art Online. Powered by NerveGear v1.100.",
  keywords: [
    "Sword Art Online",
    "SAO",
    "NerveGear",
    "Aincrad",
    "VRMMORPG",
    "RPG",
    "Kirito",
    "Asuna",
  ],
  authors: [{ name: "SAO Project" }],
  icons: {
    icon: "/sao/login/SAO_Nervegear.svg",
  },
  openGraph: {
    title: "Sword Art Online — NerveGear System",
    description: "Link Start — il mondo di Aincrad ti attende.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
        style={{ fontFamily: "'SAO UI', 'Trebuchet MS', sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
