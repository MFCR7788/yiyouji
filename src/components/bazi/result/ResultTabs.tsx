import { BookOpenText, Calendar, Sparkles } from 'lucide-react';

export type ResultTab = 'basic' | 'professional' | 'notes';

export function ResultTabs({
    activeTab,
    onChange,
}: {
    activeTab: ResultTab;
    onChange: (tab: ResultTab) => void;
}) {
    return (
        <div className="flex gap-0.5 sm:gap-1 border-b border-border mb-6 sm:mb-8 overflow-x-auto -mx-2 px-2">
            {[
                { id: 'basic', label: '基本信息', icon: Sparkles },
                { id: 'professional', label: '专业排盘', icon: Calendar },
                { id: 'notes', label: '断事笔记', icon: BookOpenText },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id as ResultTab)}
                    className={`
                        flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap
                        ${activeTab === tab.id
                            ? 'border-[#2eaadc] text-[#2eaadc]'
                            : 'border-transparent text-foreground/40 hover:text-foreground hover:bg-background-secondary'
                        }
                    `}
                >
                    <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
