import React from 'react';
import { codeToHtml } from 'shiki';
import { CodeBlock } from './code-block';
import { CopyButton } from './copy-button';

interface CodeBlockServerProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export async function CodeBlockWithHighlight({ 
  code, 
  language = 'html', 
  showLineNumbers = false, 
  className = '' 
}: CodeBlockServerProps) {
  try {
    // Server-side syntax highlighting
    const highlightedCode = await codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
      transformers: [
        {
          pre(node) {
            const existingClasses = Array.isArray(node.properties.className) 
              ? node.properties.className 
              : node.properties.className ? [node.properties.className.toString()] : [];
            
            node.properties.className = [
              ...existingClasses,
              'overflow-x-auto p-4 font-mono text-sm w-full thin-scrollbar'
            ];
            
            // Add custom style for scrollbar
            const existingStyle = node.properties.style || '';
            node.properties.style = `${existingStyle} scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.2) transparent;`;
            
            return node;
          },
          code(node) {
            const existingClasses = Array.isArray(node.properties.className) 
              ? node.properties.className 
              : node.properties.className ? [node.properties.className.toString()] : [];
            
            node.properties.className = [
              ...existingClasses,
              'text-zinc-300'
            ];
            return node;
          },
          line(node) {
            if (showLineNumbers) {
              const existingClasses = Array.isArray(node.properties.className) 
                ? node.properties.className 
                : node.properties.className ? [node.properties.className.toString()] : [];
              
              node.properties.className = [
                ...existingClasses,
                'line'
              ];
              node.properties['line-number'] = true;
            }
            return node;
          }
        }
      ]
    });
    
    // Return the highlighted code with the copy button
    return (
      <div className={`w-full ${className} code-block-container group`}>

        <div className="relative w-full rounded-md bg-black border border-white/10 overflow-hidden">
        <div className="flex justify-end mb-2 absolute top-2 right-2">
          <CopyButton code={code} />
        </div>
          <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error highlighting code:', error);
    // Fall back to the basic CodeBlock if highlighting fails
    return <CodeBlock code={code} language={language} showLineNumbers={showLineNumbers} className={className} />;
  }
} 