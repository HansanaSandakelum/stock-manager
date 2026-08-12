import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "AraliyaStocks",
  description: "Modern Stock Management System for AraliyaStocks",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
