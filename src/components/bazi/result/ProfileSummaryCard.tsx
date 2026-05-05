import { MapPinned } from 'lucide-react';
import type { BaziCanonicalJSON } from 'taibu-core/bazi';
import type { BaziMeta } from '@/lib/divination/bazi';

export function ProfileSummaryCard({
    meta,
    canonicalChart,
}: {
    meta: BaziMeta;
    canonicalChart: BaziCanonicalJSON;
}) {
    const timeText = meta.isUnknownTime
        ? '时辰未知'
        : meta.birthTime;

    const summaryItems = [
        {
            label: '出生时间',
            value: `${meta.birthDate} ${timeText}`,
        },
        canonicalChart.基本信息.出生地 ? {
            label: '出生地点',
            value: canonicalChart.基本信息.出生地,
        } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item));

    return (
        <div className="bg-background border border-border rounded-xl px-2.5 sm:px-4 md:px-6 py-2.5 sm:py-4 md:py-5 mb-3 sm:mb-4 md:mb-6 w-full max-w-full box-border">
            {/* 用户名、性别、日主、日主值 - 同一水平行显示 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-6 mb-2.5 sm:mb-3 w-full">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight break-words text-foreground flex-shrink min-w-0">
                    {meta.name}
                </h1>
                <span className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight ${meta.gender === 'male' ? 'text-blue-600/80' : 'text-pink-600/80'} flex-shrink-0`}>
                    {meta.gender === 'male' ? '男' : '女'}
                </span>
                <div className="flex items-center gap-1.5 text-sm sm:text-base md:text-lg text-foreground/60 shrink-0">
                    <span className="font-medium">日主：</span>
                    <span className="font-semibold text-foreground/80">
                        {canonicalChart.基本信息.日主}
                    </span>
                </div>
            </div>

            {/* 详细信息 - 响应式网格布局 */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-x-3 sm:gap-x-5 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm md:text-base text-foreground/60 w-full max-w-full">
                {summaryItems.map((item) => (
                    <div key={item.label} className={`flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0 ${summaryItems.length > 2 ? '' : 'sm:w-auto'} break-words`}>
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-foreground/30 shrink-0 mt-0.5 sm:mt-0">
                            {item.label}
                        </span>
                        {item.label === '出生地点' ? <MapPinned className="w-3 h-3 sm:w-3.5 sm:h-3.5 sm:w-4 sm:h-4 text-foreground/35 shrink-0" /> : null}
                        <span className="font-medium text-foreground/80 break-words text-xs sm:text-sm md:text-base leading-relaxed">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}