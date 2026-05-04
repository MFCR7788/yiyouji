import Link from 'next/link';
import { SettingsCenterLink } from '@/components/settings/SettingsCenterLink';
import { Edit3, Save, Share2, Copy, Check } from 'lucide-react';

interface ResultFooterLinksProps {
    onEdit: () => void;
    onSave: () => void;
    onCopy: () => void;
    onShare: () => void;
    saving?: boolean;
    saved?: boolean;
    copied?: boolean;
    saveDisabled?: boolean;
    saveLabel?: string;
}

export function ResultFooterLinks({
    onEdit,
    onSave,
    onCopy,
    onShare,
    saving = false,
    saved = false,
    copied = false,
    saveDisabled = false,
    saveLabel = '保存',
}: ResultFooterLinksProps) {
    return (
        <>
            <div className="mb-6 flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-background-secondary transition-all duration-150"
                >
                    <Edit3 className="w-4 h-4" />
                    修改
                </button>
                
                <button
                    type="button"
                    onClick={onSave}
                    disabled={saving || saveDisabled}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all duration-150 ${
                        saving || saveDisabled
                            ? 'cursor-not-allowed border-border bg-background text-foreground/42'
                            : 'border-border bg-background text-foreground hover:bg-background-secondary'
                    }`}
                >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? '已保存' : saveLabel}
                </button>
                
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-background-secondary transition-all duration-150"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制'}
                </button>
                
                <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border bg-background text-foreground hover:bg-background-secondary transition-all duration-150"
                >
                    <Share2 className="w-4 h-4" />
                    分享
                </button>
            </div>
            
            <div className="flex justify-center gap-4">
                <Link href="/bazi" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    新建排盘
                </Link>
                <span className="text-foreground-secondary">•</span>
                <SettingsCenterLink tab="charts" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    我的命盘
                </SettingsCenterLink>
                <span className="text-foreground-secondary">•</span>
                <Link href="/chat" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    AI 对话
                </Link>
            </div>
        </>
    );
}
