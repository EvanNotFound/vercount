import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] });
const sora = Sora({ subsets: ["latin"] });

export const viewport = {
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};
export const metadata: Metadata = {
  title: "Vercount - 不蒜子替代网站流量计数器",
  metadataBase: new URL("https://vercount.one"),
  description:
    "Vercount 提供一个强大的不蒜子网站流量计数器替代方案。轻松追踪页面浏览量和访客数量。",
  keywords:
    "Vercount, 网站计数器, 不蒜子替代品, 流量分析, 页面浏览量, 访客跟踪",
  robots: "index, follow",
  openGraph: {
    title: "Vercount - 不蒜子替代网站流量计数器",
    description:
      "Vercount 提供一个强大的不蒜子网站流量计数器替代方案。轻松追踪页面浏览量和访客数量。",
    images: "/carrd/og-image.png",
    url: "https://vercount.one",
    siteName: "Vercount",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "Vercount",
    creator: "EvanNotFound",
    title: "Vercount - 不蒜子替代网站流量计数器",
    description:
      "Vercount 提供一个强大的不蒜子网站流量计数器替代方案。轻松追踪页面浏览量和访客数量。",
    images: "/carrd/og-image.png",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth dark">
      <body className={inter.className + " " + sora.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
