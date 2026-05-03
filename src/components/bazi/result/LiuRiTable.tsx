import type { LiuRiInfo } from '@/lib/divination/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/divination/display-helpers';

export function LiuRiTable({
    liuRi,
    selectedDate,
    onSelect,
}: {
    liuRi: LiuRiInfo[];
    selectedDate: string;
    onSelect: (date: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
                {liuRi.map((ri) => {
                    const isSelected = ri.date === selectedDate;
                    const ganElement = getStemElement(ri.gan);
                    const zhiElement = getBranchElement(ri.zhi);

                    return (
                        <button
                            key={ri.date}
                            type="button"
                            onClick={() => onSelect(ri.date)}
                            className={`
                                flex-shrink-0 min-w-[44px] sm:min-w-[48px] w-auto sm:w-12 text-center p-1.5 sm:p-2 rounded-md border transition-colors word-break break-words
                                ${isSelected
                                    ? 'border-[#2eaadc] bg-blue-50/30'
                                    : 'border-border bg-background hover:bg-background-secondary'
                                }
                            `}
                        >
                            <div className="text-[9px] sm:text-[10px] font-mono text-foreground/40 mb-1 sm:mb-1.5 leading-none whitespace-nowrap">
                                {ri.date.split('-')[1]}/{ri.date.split('-')[2]}
                            </div>
                            <div className="flex flex-col items-center gap-0.5 whitespace-nowrap">
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {ri.gan}
                                </span>
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {ri.zhi}
                                </span>
                            </div>
                        </button>
                    );
                })}
        </div>
    );
}
