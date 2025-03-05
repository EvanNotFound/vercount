import { CodeBlockWithHighlight } from './ui/code-block-server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SiHtml5, SiReact } from '@icons-pack/react-simple-icons';

export default function Usage() {
	return (
        <section id="usage" className="w-full py-20 md:py-32 border-b border-white/10">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">Usage</h2>
              <p className="text-xl text-zinc-400">Choose your preferred framework</p>
              <p className="text-zinc-400">
                选择适合你的 Web 框架
              </p>
            </div>

            <div className="flex flex-col gap-8 max-w-5xl mx-auto">
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid grid-cols-2 bg-white/5 text-white w-fit border border-border h-fit mx-auto">
                  <TabsTrigger value="html" className="w-fit px-4 py-2 data-[state=active]:bg-white/10 data-[state=active]:text-white flex items-center gap-2">
                    <SiHtml5 className="w-4 h-4" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="react" className="w-fit px-4 py-2 data-[state=active]:bg-white/10 data-[state=active]:text-white flex items-center gap-2">
                    <SiReact className="w-4 h-4" />
                    React
                  </TabsTrigger>
                </TabsList>
                
                {/* HTML Implementation */}
                <TabsContent value="html" className="mt-6">
                  <div className="flex flex-col gap-8">
                    {/* Step 1 */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                          <span className="text-sm font-bold">01</span>
                        </div>
                        <h3 className="text-xl font-bold">Insert the script tag</h3>
                      </div>
                      <p className="text-zinc-400">添加以下 HTML 代码</p>
                      <CodeBlockWithHighlight 
                        code={`<script defer src="https://cn.vercount.one/js"></script>`}
                        language="html"
                      />
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                          <span className="text-sm font-bold">02</span>
                        </div>
                        <h3 className="text-xl font-bold">Insert these IDs</h3>
                      </div>
                      <p className="text-zinc-400">使用以下 ID</p>
                      <CodeBlockWithHighlight 
                        code={`Total Page View <span id="vercount_value_page_pv">Loading</span>

Total Visits <span id="vercount_value_site_pv">Loading</span>

Site Total Visitors <span id="vercount_value_site_uv">Loading</span>`}
                        language="html"
                      />
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                          <span className="text-sm font-bold">03</span>
                        </div>
                        <h3 className="text-xl font-bold">Refresh your website</h3>
                      </div>
                      <p className="text-zinc-400">刷新网页, 就可以开始计数了</p>
                      <p className="text-zinc-300 mt-2">See the numbers appear on your website.</p>
                    </div>
                  </div>
                </TabsContent>
                
                {/* React Implementation */}
                <TabsContent value="react" className="mt-6">
                  <div className="flex flex-col gap-8">
                    {/* Introduction */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <h3 className="text-xl font-bold">vercount-react</h3>
                      <p className="text-zinc-300">
                        vercount-react is a React hook designed for Vercount, providing real-time website traffic statistics while being reliable, fast, and secure.
                      </p>
                      <p className="text-zinc-400">
                        为 React 项目提供的高效计数器组件，可靠、快速且安全。
                      </p>
                    </div>
                    
                    {/* Step 1 */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                          <span className="text-sm font-bold">01</span>
                        </div>
                        <h3 className="text-xl font-bold">Install the package</h3>
                      </div>
                      <p className="text-zinc-400">选择你喜欢的包管理器安装 vercount-react</p>
                      <CodeBlockWithHighlight 
                        code={`# With npm
npm install vercount-react

# With pnpm
pnpm install vercount-react

# With yarn
yarn add vercount-react`}
                        language="bash"
                      />
                    </div>


                    {/* Step 2: Hook Approach */}
                    <div className="flex flex-col space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                      <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                          <span className="text-sm font-bold">02</span>
                        </div>
                        <h3 className="text-xl font-bold">Use the hook</h3>
                      </div>
                      <p className="text-zinc-400">在 React 项目中使用 vercount-react 的 Hook</p>
                      <CodeBlockWithHighlight 
                        code={`import { useVercount } from 'vercount-react'

export default function Home() {
  const { sitePv, pagePv, siteUv } = useVercount()

  return (
    <div>
      <h1>Site Page Views: {sitePv}</h1>
      <h2>Page Views: {pagePv}</h2>
      <h2>Unique Visitors: {siteUv}</h2>
    </div>
  )
}`}
                        language="jsx"
                      />
                      <div className="mt-2 space-y-2">
                        <p className="text-zinc-300 font-medium">Return Values:</p>
                        <ul className="list-disc list-inside space-y-1 text-zinc-300">
                          <li><span className="font-mono text-blue-400">sitePv</span>: The total number of page views across the entire website.</li>
                          <li><span className="font-mono text-blue-400">pagePv</span>: The number of page views on the current page.</li>
                          <li><span className="font-mono text-blue-400">siteUv</span>: The number of unique visitors to the website.</li>
                        </ul>
                      </div>
                      <p className="text-zinc-300 mt-2">Visit <a href="https://github.com/EvanNotFound/vercount-react" className="text-blue-400 hover:underline">vercount-react</a> for more documentation.</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
	);
}   