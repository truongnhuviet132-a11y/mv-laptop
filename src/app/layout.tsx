import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MV Laptop",
  description: "Dashboard quản lý kinh doanh laptop",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "MV Laptop",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "#f8fafc" }}>
        <PwaRegister />
        <AppHeader />
        <main style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "16px" }}>{children}</main>
      </body>
    </html>
  );
}
