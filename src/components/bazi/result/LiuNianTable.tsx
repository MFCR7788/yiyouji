import type { LiuNianInfo } from '@/lib/divination/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/divination/display-helpers';

export function LiuNianTable({
    liuNian,
    selectedYear,
    onSelect,
}: {
    liuNian: LiuNianInfo[];
    selectedYear: number;
    onSelect: (year: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
                {liuNian.map((ln, index) => {
                    const isSelected = selectedYear === ln.year;
                    const ganElement = getStemElement(ln.gan);
                    const zhiElement = getBranchElement(ln.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(ln.year)}
                            className={`
                                flex-shrink-0 min-w-[48px] sm:min-w-[56px] w-auto sm:w-14 text-center p-1.5 sm:p-2.5 rounded-md border transition-colors word-break break-words
                                ${isSelected
                                    ? 'border-[#2eaadc] bg-blue-50/30'
                                    : 'border-border bg-background hover:bg-background-secondary'
                                }
                            `}
                        >
                            <div className="text-[9px] sm:text-[10px] font-bold text-foreground/30 uppercase tracking-wider whitespace-normal">{ln.year}</div>
                            <div className="flex flex-col items-center gap-0.5 my-1 sm:my-1.5 whitespace-nowrap">
                                <span
                                    className="text-sm sm:text-sm font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {ln.gan}
                                </span>
                                <span
                                    className="text-sm sm:text-sm font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {ln.zhi}
                                </span>
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-foreground/40 whitespace-normal">{ln.age}岁</div>
                        </button>
                    );
                })}
        </div>
    );
}
