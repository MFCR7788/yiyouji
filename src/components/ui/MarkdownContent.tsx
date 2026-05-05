/**
 * Markdown 内容渲染组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useMemo)
 * - 动态导入 ChartRenderer 组件
 *
 * 性能优化：
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useMemo 缓存组件定义和 textClass
 * - 静态组件提取到组件外部
 */
'use client';

import { memo, useMemo, lazy, Suspense } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChartData } from '@/lib/visualization/chart-types';

const ChartRenderer = lazy(() => import('@/components/visualization/ChartRenderer'));

interface MarkdownContentProps {
    content: string;
    className?: string;
}

// 静态组件定义，避免每次渲染重新创建
const staticComponents: Partial<Components> = {
    h1: ({ children }) => (
        <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>
    ),
    h4: ({ children }) => (
        <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h4>
    ),
    h5: ({ children }) => (
        <h5 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h5>
    ),
    h6: ({ children }) => (
        <h6 className="text-sm font-medium mt-2 mb-1 text-foreground-secondary">{children}</h6>
    ),
    a: ({ href, children }) => (
        <a href={href} className="text-accent underline underline-offset-2">{children}</a>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 py-1 my-3 italic text-foreground-secondary">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-6 border-border" />,
    table: ({ children }) => (
        <div className="my-4 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <div className="min-w-[320px] sm:min-w-0">
                <table className="w-full border-collapse text-xs sm:text-sm">{children}</table>
            </div>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="border-b-2 border-border bg-background-secondary/50">{children}</thead>
    ),
    tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-background-secondary/30">{children}</tr>,
    th: ({ children }) => (
        <th className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-foreground whitespace-nowrap text-xs sm:text-sm">{children}</th>
    ),
    td: ({ children }) => (
        <td className="px-1.5 sm:px-3 py-1.5 sm:py-2 text-foreground-secondary text-xs sm:text-sm break-words">{children}</td>
    ),
    strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    img: ({ src, alt }) => (
        <img src={src} alt={alt || ''} className="w-full h-auto max-w-full rounded-lg my-4" loading="lazy" />
    ),
    code: ({ className, children }) => {
        const match = /language-(\w+)/.exec(className || '');
        const isInline = !className;

        if (!isInline && match?.[1] === 'chart') {
            try {
                const chartData = JSON.parse(String(children).trim()) as ChartData;
                return (
                    <div className="my-4 max-w-full overflow-hidden">
                        <Suspense fallback={
                            <div className="flex flex-col items-center justify-center py-8 sm:py-12 min-h-[200px] bg-background-secondary/30 rounded-xl">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-[#1f9d6d] border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-xs sm:text-sm text-foreground-secondary">正在加载图表...</p>
                            </div>
                        }>
                            <ChartRenderer data={chartData} />
                        </Suspense>
                    </div>
                );
            } catch (parseError) {
                console.error('[MarkdownContent] 图表数据解析失败:', parseError);
                return (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6 my-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-500 text-xs">!</span>
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-red-600 mb-1">图表数据解析失败</p>
                                <p className="text-xs text-red-400">数据格式错误，无法渲染图表</p>
                            </div>
                        </div>
                    </div>
                );
            }
        }

        return (
            <code
                className={isInline
                    ? 'px-1 py-0.5 rounded bg-background-secondary text-xs'
                    : 'block p-3 rounded-lg bg-background-secondary text-xs overflow-x-auto'}
            >
                {children}
            </code>
        );
    },
};

// remarkPlugins 数组提取到外部，避免每次渲染创建新数组
const remarkPlugins = [remarkGfm];

function MarkdownContentInner({ content, className }: MarkdownContentProps) {
    // 使用 useMemo 缓存 textClass，避免每次渲染重新拼接字符串
    const textClass = useMemo(
        () => `leading-relaxed ${className ?? 'text-sm text-foreground'}`,
        [className]
    );

    // 使用 useMemo 缓存依赖 className 的组件
    const dynamicComponents = useMemo<Partial<Components>>(() => ({
        p: ({ children }) => (
            <p className={`${textClass} whitespace-pre-wrap`}>{children}</p>
        ),
        ul: ({ children }) => (
            <ul className={`${textClass} list-disc pl-5 space-y-1`}>{children}</ul>
        ),
        ol: ({ children }) => (
            <ol className={`${textClass} list-decimal pl-5 space-y-1`}>{children}</ol>
        ),
        li: ({ children }) => <li className={textClass}>{children}</li>,
    }), [textClass]);

    // 合并静态和动态组件
    const components = useMemo<Partial<Components>>(
        () => ({ ...staticComponents, ...dynamicComponents }),
        [dynamicComponents]
    );

    return (
        <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
            {content}
        </ReactMarkdown>
    );
}

// 使用 memo 包装，只在 content 或 className 变化时重渲染
export const MarkdownContent = memo(MarkdownContentInner);
