import React from "react";
import { CopyButton } from "./copy-button";

interface CodeBlockProps {
	code: string;
	language?: string;
	showLineNumbers?: boolean;
	className?: string;
}

// This is a server component
export function CodeBlock({
	code,
	language = "html",
	showLineNumbers = false,
	className = "",
}: CodeBlockProps) {
	return (
		<div className={`w-full ${className} code-block-container group`}>
			<div className="flex justify-end mb-2">
				<CopyButton code={code} />
			</div>
			<div className="relative w-full rounded-md bg-black border border-white/10 overflow-hidden">
				<div className="overflow-x-auto p-4 font-mono text-sm thin-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent' }}>
					<pre className={`language-${language}`}>
						<code className="text-zinc-300">{code}</code>
					</pre>
				</div>
			</div>
		</div>
	);
}

// Export the CodeBlockServer for backward compatibility
export const CodeBlockServer = CodeBlock;
