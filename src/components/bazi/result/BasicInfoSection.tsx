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
        <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* 日主特征卡片 */}
            <section className="bg-background rounded-xl border border-border overflow-hidden">
                <div className="px-4 md:px-6 py-4 md:py-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-foreground/5">
                            <User className="w-5 h-5 text-foreground/40" />
                        </div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
                            日主特征
                        </h2>
                    </div>
                </div>
                <div className="px-4 md:px-6 pb-4 md:pb-6">
                    <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
                        <div
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-3xl sm:text-4xl font-bold text-white shrink-0 shadow-md transition-transform hover:scale-105"
                            style={{ backgroundColor: getElementColor(dayMasterElement as FiveElement) }}
                        >
                            {canonicalChart.基本信息.日主}
                        </div>
                        <div className="space-y-2 md:space-y-3 flex-1">
                            <div className="font-semibold text-lg sm:text-xl text-foreground">
                                日主「{canonicalChart.基本信息.日主}」，五行属{dayMasterElement}
                            </div>
                            <p className="text-sm sm:text-base text-foreground/70 leading-relaxed max-w-2xl">
                                {dayMasterDescription}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI 专业分析区域 */}
            <div className="space-y-4 md:space-y-6">
                {/* 五行分析 */}
                {!hasKnownBirthTime ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden">
                        <div className="px-4 md:px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                                    <Info className="w-4 h-4 text-[#dfab01]" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        请先补全出生时辰并保存命盘，再使用 AI 深度解读
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden">
                        <div className="px-4 md:px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                                    <Save className="w-4 h-4 text-[#2eaadc]" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5">深度洞察五行旺衰与调候建议</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        请先点击页面右上角「保存」命盘，即可解锁 AI 深度解读功能
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-blue-50/30 border border-blue-100 rounded-xl p-6 md:p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-[#2eaadc]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-base font-bold">AI 五行分析</h3>
                            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
                                登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                            </p>
                        </div>
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
                    <section className="bg-background rounded-xl border border-border overflow-hidden">
                        <div className="px-4 md:px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                                    <Info className="w-4 h-4 text-[#dfab01]" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        请先补全出生时辰并保存命盘，再使用 AI 性格分析
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden">
                        <div className="px-4 md:px-6 py-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-background border border-border/60 shrink-0">
                                    <User className="w-4 h-4 text-[#a083ff]" />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground/80">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/40 mt-0.5">基于十神命局的深度性格画像</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-[#dfab01]/5 border border-[#dfab01]/10 rounded-lg text-xs text-[#dfab01] font-medium">
                                        <Info className="w-3.5 h-3.5 shrink-0" />
                                        保存命盘后即可开启 AI 性格特征分析
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-[#a083ff]/5 border border-[#a083ff]/10 rounded-xl p-6 md:p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#a083ff]/10 flex items-center justify-center mx-auto mb-4">
                            <User className="w-6 h-6 text-[#a083ff]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-base font-bold">AI 性格分析</h3>
                            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
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
            <div className="pt-2">
                <TenGodKnowledge highlightedTenGods={highlightedTenGods} />
            </div>
        </div>
    );
}