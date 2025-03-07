import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
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
		"Vercount is a straightforward, fast, and reliable website view counter. Vercount 是一个完美的不蒜子网站计数器替代方案，轻松统计页面浏览量和访客数量。",
	keywords:
		"Vercount, 网站计数器, 不蒜子替代品, 流量分析, 页面浏览量, 访客跟踪, Website Counter, Website View Counter, Website Visitor Counter",
	robots: "index, follow",
	twitter: {
		card: "summary_large_image",
		site: "Vercount",
		creator: "EvanNotFound",
		title: "Vercount - 不蒜子替代网站流量计数器",
		description:
			"Vercount 提供一个强大的不蒜子网站流量计数器替代方案。轻松追踪页面浏览量和访客数量。",
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
