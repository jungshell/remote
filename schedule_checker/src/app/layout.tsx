import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import AuthProvider from "@/components/AuthProvider";
import AppShellWrapper from "@/components/AppShellWrapper";
import DailySummaryScheduler from "@/components/DailySummaryScheduler";
import TemplateScheduler from "@/components/TemplateScheduler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoFlow - 업무 자동화 대시보드",
  description:
    "스마트 우선순위, 요약 알림, 시각화로 업무 효율을 극대화하는 업무 자동화 앱",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <DailySummaryScheduler />
            <TemplateScheduler />
            <AppShellWrapper>{children}</AppShellWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
