import type { Metadata } from "next";
import { Geist, Geist_Mono, Gamja_Flower } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gamjaFlower = Gamja_Flower({
  weight: "400",
  variable: "--font-gamja",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "우리가족 일기",
  description: "오늘 하루를 그림일기로 정리해요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gamjaFlower.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
