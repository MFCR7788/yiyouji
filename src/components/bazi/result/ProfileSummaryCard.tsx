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
            label: '日主',
            value: canonicalChart.基本信息.日主,
        },
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
        <div className="bg-background border border-border rounded-xl px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 mb-4 md:mb-6 w-full max-w-full">
            <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between w-full">
                <div className="flex flex-wrap items-center gap-2 min-w-0 w-full">
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words text-foreground">
                        {meta.name}
                    </h1>
                    <span className={`px-2 sm:px-2.5 py-0.5 text-[12px] sm:text-[12px] font-bold rounded-md uppercase tracking-[0.15em] sm:tracking-[0.18em] ${meta.gender === 'male' ? 'text-blue-600/80 bg-blue-50' : 'text-pink-600/80 bg-pink-50'} flex-shrink-0`}>
                        {meta.gender === 'male' ? '男' : '女'}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-wrap sm:flex-row items-start sm:items-center gap-x-3 sm:gap-x-5 gap-y-1.5 text-xs sm:text-sm md:text-base text-foreground/60 lg:justify-end lg:min-w-0 lg:pl-6 lg:border-l lg:border-border/60 w-full">
                    {summaryItems.map((item) => (
                        <div key={item.label} className="flex items-center gap-1 min-w-0 w-full sm:w-auto break-words">
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] text-foreground/30 shrink-0">
                                {item.label}
                            </span>
                            {item.label === '出生地点' ? <MapPinned className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground/35 shrink-0" /> : null}
                            <span className="font-medium text-foreground/80 break-words text-xs sm:text-sm md:text-base">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
