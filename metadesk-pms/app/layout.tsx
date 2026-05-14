import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/context/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Metadesk PMS",
  description: "Internal Project Management System — Metadesk Global",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-brand-darker text-slate-200 antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            gutter={10}
            containerStyle={{ top: 18, right: 18 }}
            toastOptions={{
              className: "metadesk-toast",
              duration: 3600,
              style: {
                background: "transparent",
                boxShadow: "none",
                padding: 0,
              },
              success: {
                className: "metadesk-toast metadesk-toast-success",
                iconTheme: {
                  primary: "#16a34a",
                  secondary: "#dcfce7",
                },
              },
              error: {
                className: "metadesk-toast metadesk-toast-error",
                duration: 4600,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fee2e2",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
