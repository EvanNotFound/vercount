import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Heart } from "lucide-react";

export default function Sponsorship() {
  return (
    <section id="sponsorship" className="w-full py-16 md:py-24">
      <div className="container mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col items-center justify-center space-y-12 text-center max-w-4xl mx-auto">
          {/* Public Welfare Project */}
          <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">公益项目</h2>
              <p className="text-lg text-zinc-400">
                Vercount 是一个完全由个人资金支持的公益项目
              </p>
          </div>

          {/* Combined Support and Warning Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Support Section */}
            <div className="space-y-6 bg-white/5 p-8 rounded-2xl w-full border border-border">
              <div className="flex items-center justify-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold">支持我</h3>
              </div>
              
              <p className="text-base text-zinc-400">
                这是一个公益项目，诚挚请求您的支持。即使是小额捐助，也能帮助我维持项目的长期运转。
              </p>
              
              <div className="bg-white/10 p-5 rounded-xl text-sm">
                <h4 className="font-semibold mb-3">📝 支出明细</h4>
                <div className="text-left text-zinc-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Vercel Pro + 函数调用:</span>
                    <span>~¥154/月</span>
                  </div>
                  <div className="flex justify-between">
                    <span>数据库 + 域名:</span>
                    <span>~¥390/年</span>
                  </div>
                </div>
              </div>
              
              <Button size="lg" className="rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 w-full py-6 text-white" asChild>
                <Link href="https://evannotfound.com/sponsor" target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-5 w-5" /> 支持我
                </Link>
              </Button>
            </div>

            {/* Warning Section */}
            <div className="space-y-6 bg-gradient-to-b from-amber-950/30 to-amber-950/10 border border-amber-500/30 p-8 rounded-2xl backdrop-blur-sm w-full">
              <div className="flex items-center justify-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">重要声明</h3>
              </div>
              
              <p className="text-base text-zinc-300 font-medium">
                严禁使用脚本或程序尝试修改访问计数！
              </p>
              
              <p className="text-sm text-zinc-400">
                这种行为违反服务条款，可能导致 IP 被永久封禁。此服务由个人资金支持，恶意刷访问量会增加运营成本（Vercel 边缘访问费用），可能导致服务终止。
              </p>
              
              <p className="text-sm text-zinc-400">
                如果需要手动更改数据，请联系: <Link href="https://evannotfound.com/contact" className="text-amber-400 hover:text-amber-300 underline transition-colors underline-offset-4 decoration-amber-400/60" target="_blank" rel="noopener noreferrer">evannotfound.com/contact</Link>
              </p>
              
              <div className="p-5 bg-white/5 rounded-xl">
                <p className="font-medium text-zinc-300 text-sm mb-3">安全措施</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>用户代理检测</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>IP 封禁</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>浏览器指纹识别</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-400">
                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>访问频率限制</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 