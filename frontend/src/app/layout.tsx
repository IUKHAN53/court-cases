import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppFrame } from "@/components/shell/AppFrame";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CourtTrack — Case Management & Reporting",
  description:
    "Track court cases, hearing deadlines and reporting for the Agriculture Department.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <AuthProvider>
          <ToastProvider>
            <AppFrame>{children}</AppFrame>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
