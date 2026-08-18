import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { AuthProvider } from "@/components/auth/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "APTLY — AI Interview Coach",
    template: "%s | APTLY",
  },
  description:
    "Evidence-grounded multimodal AI interview coaching. Measure delivery, diagnose gaps, practice with purpose.",
  keywords: ["interview", "coaching", "AI", "preparation", "practice"],
  openGraph: {
    title: "APTLY — AI Interview Coach",
    description:
      "Evidence-grounded multimodal AI interview coaching.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <AuthProvider>
            <ReactQueryProvider>
              {children}
              <AuthModal />
            </ReactQueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

