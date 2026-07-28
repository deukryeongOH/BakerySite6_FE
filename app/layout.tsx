import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "오픈베이크",
  description: "베이커리 드롭(한정판매) 쇼핑몰",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "오픈베이크",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`dark ${playfairDisplay.variable} ${inter.variable} ${jetbrainsMono.variable} h-dvh antialiased`}
    >
      <body className="h-dvh overflow-hidden font-sans flex justify-center bg-black">
        <div className="w-full max-w-[480px] h-full flex flex-col overflow-hidden">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
