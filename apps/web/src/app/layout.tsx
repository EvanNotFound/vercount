import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import "@/styles/shiki.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/providers";
import { GeistMono } from 'geist/font/mono';



const sora = Sora({ subsets: ["latin"],
	variable: "--font-sora",
 });

export const viewport = {
	colorScheme: "light",
	width: "device-width",
	initialScale: 1,
};
export const metadata: Metadata = {
	title: "Vercount - 网站流量计数器",
	metadataBase: new URL("https://vercount.one"),
	description:
		"Vercount is a straightforward, fast, and reliable website counter powered by Go and Redis, with Next.js for dashboard and compatibility flows. Vercount 是一个基于 Go 和 Redis 的网站计数器，并由 Next.js 提供后台。",
	keywords:
		"Vercount, 网站计数器, 不蒜子替代品, 流量分析, 页面浏览量, 访客跟踪, Website Counter, Website View Counter, Website Visitor Counter",
	robots: "index, follow",
	twitter: {
		card: "summary_large_image",
		site: "Vercount",
		creator: "EvanNotFound",
		title: "Vercount - 不蒜子替代网站流量计数器",
		description:
			"Vercount 提供一个以 Go + Redis 为核心的不蒜子替代网站流量计数器，并由 Next.js 提供后台。",
		images: "/assets/opengraph-image.png",
	},
};
export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="scroll-smooth dark">
			<body className={`${GeistMono.variable} ${sora.variable} font-sans`}>
				<Providers>
					{children}
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
