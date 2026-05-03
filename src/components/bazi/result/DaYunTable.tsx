import type { DaYunInfo } from '@/lib/divination/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/divination/display-helpers';

export function DaYunTable({
    daYun,
    selectedIndex,
    onSelect,
}: {
    daYun: DaYunInfo[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
                {daYun.map((dy, index) => {
                    const isSelected = selectedIndex === index;
                    const ganElement = getStemElement(dy.gan);
                    const zhiElement = getBranchElement(dy.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(index)}
                            className={`
                                flex-shrink-0 min-w-[64px] sm:min-w-[72px] w-auto sm:w-20 text-center p-2 sm:p-3 rounded-md border transition-colors word-break break-words
                                ${isSelected
                                    ? 'border-[#2eaadc] bg-blue-50/30'
                                    : 'border-border bg-background hover:bg-background-secondary'
                                }
                            `}
                        >
                            <div className="text-[10px] sm:text-[11px] font-bold text-foreground/30 uppercase tracking-wider whitespace-normal">{dy.startYear}</div>
                            <div className="text-[11px] sm:text-[12px] font-semibold text-foreground/50 mb-1 sm:mb-1.5 whitespace-normal">{dy.startAge}岁</div>
                            <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {dy.gan}
                                </span>
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {dy.zhi}
                                </span>
                            </div>
                        </button>
                    );
                })}
        </div>
    );
}
