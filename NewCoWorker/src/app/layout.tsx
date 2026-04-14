import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/ClientShell";
import { siteMeta } from "@/content/site";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteMeta.title,
  description: "충남 진흥원 신입 사원 온보딩용 기초 정보 웹 가이드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
