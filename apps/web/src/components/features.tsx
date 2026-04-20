import { Zap, Globe, Shield, RefreshCw, Code, Database, Server, LucideIcon } from "lucide-react";

type FeatureItem = {
	icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
	title: string;
	description: string;
};

// Features configuration
const featuresConfig: FeatureItem[] = [
	{
		icon: Zap,
		title: "高速响应",
		description: "公共计数链路由 Go 服务直接处理，响应更快也更稳定",
	},
	{
		icon: Globe,
		title: "准确统计",
		description: "使用 POST 请求进行统计，不再使用不蒜子的过时 Referrer 方法，实现移动端 / Firefox / Safari 等浏览器的准确统计",
	},
	{
		icon: Shield,
		title: "安全可靠",
		description: "保留现有兼容接口的同时，持续加强公共计数接口的安全与风控能力",
	},
	{
		icon: RefreshCw,
		title: "自动同步",
		description: "初始化自动同步所有不蒜子的数据，无需手动操作，每访问一次，数据就会自动同步",
	},
	{
		icon: Code,
		title: "兼容性好",
		description: "兼容不蒜子的 span 标签，可以无缝切换",
	},
	{
		icon: Database,
		title: "数据可靠",
		description: "使用 Redis 作为共享计数存储，数据稳定可靠，并由多个服务共同读取",
	},
	{
		icon: Server,
		title: "清晰架构",
		description: "Go + Redis 负责核心计数后端，Next.js 负责后台、鉴权、域名管理与兼容层",
	},
	{
		icon: RefreshCw,
		title: "编辑访客数据",
		description: "支持编辑访客数据，提供更灵活的数据管理选项",
	},
];

export default function Features() {
	return (
		<section id="features" className="w-full py-20 md:py-32 border-b border-white/10">
			<div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div className="flex flex-col items-center justify-center space-y-4 text-center mb-16 max-w-3xl mx-auto">
				<h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Features</h2>
				<p className="text-xl text-zinc-400">Vercount 是一个更快、更稳定的不蒜子计数替代方案</p>
			</div>

				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
					{featuresConfig.map((feature, index) => {
						const Icon = feature.icon;
						return (
							<div key={index} className="flex flex-col space-y-3 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
									<Icon className="h-5 w-5 text-zinc-400" />
								</div>
								<h3 className="text-lg font-bold">{feature.title}</h3>
								<p className="text-zinc-400 text-sm">{feature.description}</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
