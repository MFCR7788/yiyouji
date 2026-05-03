/**
 * 八字基本信息区块
 *
 * 对齐 Notion 风格：极简卡片、移除渐变、标准化边框与按钮
 */
import { User, Save, Sparkles, Info } from 'lucide-react';
import type { BaziCanonicalJSON } from 'taibu-core/bazi';
import { getElementColor } from '@/lib/divination/display-helpers';
import { TenGodKnowledge } from '@/components/bazi/TenGodKnowledge';
import { AIWuxingAnalysis } from '@/components/bazi/result/AIWuxingAnalysis';
import { AIPersonalityAnalysis } from '@/components/bazi/result/AIPersonalityAnalysis';
import type { FiveElement, TenGod } from '@/types';

interface BasicInfoSectionProps {
    canonicalChart: BaziCanonicalJSON;
    dayMasterDescription: string;
    chartId?: string | null;
    userId?: string | null;
    credits?: number | null;
    savedWuxingAnalysis?: string | null;
    savedWuxingReasoning?: string | null;
    savedWuxingModelId?: string | null;
    savedPersonalityAnalysis?: string | null;
    savedPersonalityReasoning?: string | null;
    savedPersonalityModelId?: string | null;
    hasKnownBirthTime?: boolean;
    onSaveWuxingAnalysis?: (analysis: string) => void;
    onSavePersonalityAnalysis?: (analysis: string) => void;
    onLoginRequired?: () => void;
}

export function BasicInfoSection({
    canonicalChart,
    dayMasterDescription,
    chartId,
    userId,
    credits,
    savedWuxingAnalysis,
    savedWuxingReasoning,
    savedWuxingModelId,
    savedPersonalityAnalysis,
    savedPersonalityReasoning,
    savedPersonalityModelId,
    hasKnownBirthTime = true,
    onSaveWuxingAnalysis,
    onSavePersonalityAnalysis,
    onLoginRequired,
}: BasicInfoSectionProps) {
    const highlightedTenGods: TenGod[] = [
        canonicalChart.四柱[0]?.天干十神,
        canonicalChart.四柱[1]?.天干十神,
        canonicalChart.四柱[3]?.天干十神,
    ].filter((g): g is TenGod => !!g);
    const dayMasterElement = canonicalChart.基本信息.命主五行?.slice(-1) || '';

    const isSaved = Boolean(chartId);
    return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in w-full">
            {/* 日主特征卡片 */}
            <section className="bg-background rounded-xl border border-border overflow-hidden w-full">
                <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 w-full">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="p-2 rounded-lg bg-foreground/5 flex-shrink-0">
                            <User className="w-5 h-5 text-foreground/40" />
                        </div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50 break-words flex-1 min-w-0">
                            日主特征
                        </h2>
                    </div>
                </div>
                <div className="px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6 w-full">
                    <div className="flex flex-col md:flex-row items-start gap-3 sm:gap-4 md:gap-6 w-full">
                        <div
                            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold text-white flex-shrink-0 shadow-md transition-transform hover:scale-105"
                            style={{ backgroundColor: getElementColor(dayMasterElement as FiveElement) }}
                        >
                            {canonicalChart.基本信息.日主}
                        </div>
                        <div className="space-y-2 md:space-y-3 flex-1 min-w-0 w-full">
                            <div className="font-semibold text-base sm:text-lg md:text-xl text-foreground break-words w-full">
                                日主「{canonicalChart.基本信息.日主}」，五行属{dayMasterElement}
                            </div>
                            <p className="text-xs sm:text-sm md:text-base text-foreground/70 leading-relaxed break-words w-full">
                                {dayMasterDescription}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI 专业分析区域 */}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 w-full">
                {/* 五行分析 */}
                {!hasKnownBirthTime ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full">
                        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 w-full">
                            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 flex-shrink-0">
                                    <Info className="w-4 h-4 text-[#dfab01]" />
                                </div>
                                <div className="space-y-3 flex-1 min-w-0 w-full">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80 break-words">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5 break-words">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-wrap items-start gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium w-full">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="break-words">请先补全出生时辰并保存命盘，再使用 AI 深度解读</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full">
                        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 w-full">
                            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 flex-shrink-0">
                                    <Save className="w-4 h-4 text-[#2eaadc]" />
                                </div>
                                <div className="space-y-3 flex-1 min-w-0 w-full">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80 break-words">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5 break-words">深度洞察五行旺衰与调候建议</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-wrap items-start gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium w-full">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="break-words">请先点击页面右上角「保存」命盘，即可解锁 AI 深度解读功能</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 sm:p-6 md:p-8 text-center w-full">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-[#2eaadc]" />
                        </div>
                        <div className="space-y-2 w-full">
                            <h3 className="text-base font-bold break-words">AI 五行分析</h3>
                            <p className="text-sm text-foreground/50 break-words w-full">
                        <button
                            onClick={onLoginRequired}
                            className="mt-4 px-5 py-2 bg-[#2383e2] text-white text-sm font-medium rounded-lg hover:bg-[#2383e2]/90 transition-colors"
                        >
                            立即登录体验
                        </button>
                    </section>
                ) : (
                    <AIWuxingAnalysis
                        chartId={chartId!}
                        userId={userId}
                        credits={credits}
                        savedAnalysis={savedWuxingAnalysis}
                        savedReasoning={savedWuxingReasoning}
                        savedModelId={savedWuxingModelId}
                        onSaveAnalysis={onSaveWuxingAnalysis || (() => { })}
                        onLoginRequired={onLoginRequired}
                    />
                )}

                {/* 性格分析 */}
                {!hasKnownBirthTime ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full">
                        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 w-full">
                            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 flex-shrink-0">
                                    <Info className="w-4 h-4 text-[#dfab01]" />
                                </div>
                                <div className="space-y-3 flex-1 min-w-0 w-full">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80 break-words">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5 break-words">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-wrap items-start gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium w-full">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="break-words">请先补全出生时辰并保存命盘，再使用 AI 性格分析</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full">
                        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 w-full">
                            <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 flex-shrink-0">
                                    <User className="w-4 h-4 text-[#a083ff]" />
                                </div>
                                <div className="space-y-3 flex-1 min-w-0 w-full">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80 break-words">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5 break-words">基于十神命局的深度性格画像</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-wrap items-start gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium w-full">
                                        <div className="flex items-center gap-2">
                                            <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="break-words">保存命盘后即可开启 AI 性格特征分析</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-[#a083ff]/5 border border-[#a083ff]/10 rounded-xl p-4 sm:p-6 md:p-8 text-center w-full">
                        <div className="w-12 h-12 rounded-full bg-[#a083ff]/10 flex items-center justify-center mx-auto mb-4">
                            <User className="w-6 h-6 text-[#a083ff]" />
                        </div>
                        <div className="space-y-2 w-full">
                            <h3 className="text-base font-bold break-words">AI 性格分析</h3>
                            <p className="text-sm text-foreground/50 break-words w-full">
                                登录后解锁基于您命盘的深度性格倾向与职场建议
                            </p>
                        </div>
                        <button
                            onClick={onLoginRequired}
                            className="mt-4 px-5 py-2 bg-[#a083ff] text-white text-sm font-medium rounded-lg hover:bg-[#a083ff]/90 transition-colors"
                        >
                            立即登录体验
                        </button>
                    </section>
                ) : (
                    <AIPersonalityAnalysis
                        chartId={chartId!}
                        userId={userId}
                        credits={credits}
                        savedAnalysis={savedPersonalityAnalysis}
                        savedReasoning={savedPersonalityReasoning}
                        savedModelId={savedPersonalityModelId}
                        onSaveAnalysis={onSavePersonalityAnalysis || (() => { })}
                        onLoginRequired={onLoginRequired}
                    />
                )}
            </div>

            {/* 十神知识库 */}
            <div className="pt-2 w-full">
                <TenGodKnowledge highlightedTenGods={highlightedTenGods} />
            </div>
        </div>
    );
}