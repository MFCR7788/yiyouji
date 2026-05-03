/**
 * 八字基本信息区块
 *
 * 设计原则：
 * - 参照专业排盘页面的视觉设计风格
 * - 统一卡片头部、间距、色彩体系
 * - 保持功能完整性的同时提升用户体验
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
        <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in w-full max-w-full">
            {/* 日主特征卡片 - 核心信息展示 */}
            <section className="bg-background rounded-xl border border-border overflow-hidden w-full max-w-full box-border shadow-sm">
                {/* 卡片头部 - 参照专业排盘风格 */}
                <div className="px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 md:py-5 bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-900/20 dark:to-transparent border-b border-border/50">
                    <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground/90 break-words">
                        <User className="w-4 h-4 text-[#2eaadc] flex-shrink-0" />
                        日主特征
                    </h2>
                </div>

                {/* 卡片内容 - 优化布局 */}
                <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
                    <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 md:gap-6 w-full max-w-full">
                        {/* 天干图标 - 增强视觉效果 */}
                        <div
                            className="w-16 h-16 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl font-bold text-white flex-shrink-0 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                            style={{
                                backgroundColor: getElementColor(dayMasterElement as FiveElement),
                                boxShadow: `0 8px 24px -4px ${getElementColor(dayMasterElement as FiveElement)}40`
                            }}
                        >
                            {canonicalChart.基本信息.日主}
                        </div>

                        {/* 文字内容 - 优化层级 */}
                        <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3 md:space-y-4 w-full max-w-full">
                            {/* 主标题 */}
                            <div className="font-bold text-base sm:text-lg md:text-xl text-foreground break-words leading-tight">
                                日主「{canonicalChart.基本信息.日主}」，五行属{dayMasterElement}
                            </div>
                            
                            {/* 描述文字 */}
                            <p className="text-xs sm:text-sm md:text-base text-foreground/65 leading-relaxed break-words line-clamp-4 sm:line-clamp-none">
                                {dayMasterDescription}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI 专业分析区域 */}
            <div className="space-y-4 sm:space-y-5 md:space-y-6 w-full max-w-full">
                {/* 五行分析 */}
                {!hasKnownBirthTime ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full max-w-full box-border shadow-sm">
                        <div className="px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 md:py-5 w-full max-w-full">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/10 border border-yellow-200/60 dark:border-yellow-700/30 flex-shrink-0 shadow-sm">
                                    <Info className="w-4 h-4 text-[#f59e0b]" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2.5 w-full max-w-full">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/85 break-words">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/45 mt-1 break-words leading-relaxed">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="inline-flex items-start gap-2 px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/10 border border-amber-200/60 dark:border-amber-700/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 font-medium w-fit max-w-full">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="break-words leading-relaxed">请先补全出生时辰并保存命盘，再使用 AI 深度解读</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full max-w-full box-border shadow-sm">
                        <div className="px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 md:py-5 w-full max-w-full">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 border border-blue-200/60 dark:border-blue-700/30 flex-shrink-0 shadow-sm">
                                    <Save className="w-4 h-4 text-[#2eaadc]" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2.5 w-full max-w-full">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/85 break-words">AI 专业五行分析</h4>
                                        <p className="text-xs text-foreground/45 mt-1 break-words leading-relaxed">深度洞察五行旺衰与调候建议</p>
                                    </div>
                                    <div className="inline-flex items-start gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/15 dark:to-indigo-900/10 border border-blue-200/60 dark:border-blue-700/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-medium w-fit max-w-full">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="break-words leading-relaxed">请先点击页面右上角「保存」命盘，即可解锁 AI 深度解读功能</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-purple-900/20 border border-blue-200/70 dark:border-blue-700/40 rounded-xl p-5 sm:p-7 md:p-9 text-center w-full max-w-full box-border overflow-hidden shadow-md">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-500/20 dark:to-purple-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <Sparkles className="w-7 h-7 text-[#2eaadc]" />
                        </div>
                        <div className="space-y-2.5 w-full max-w-full">
                            <h3 className="text-base sm:text-lg font-bold text-foreground/95 break-words">AI 五行分析</h3>
                            <p className="text-sm text-foreground/55 break-words w-full max-w-full mx-auto leading-relaxed max-w-md">
                                登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                            </p>
                        </div>
                        <button
                            onClick={onLoginRequired}
                            className="mt-5 px-6 py-2.5 bg-gradient-to-r from-[#2383e2] to-[#1e88e5] text-white text-sm font-medium rounded-xl hover:from-[#1976d2] hover:to-[#1565c0] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
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
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full max-w-full box-border shadow-sm">
                        <div className="px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 md:py-5 w-full max-w-full">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/10 border border-purple-200/60 dark:border-purple-700/30 flex-shrink-0 shadow-sm">
                                    <User className="w-4 h-4 text-[#a083ff]" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2.5 w-full max-w-full">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/85 break-words">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/45 mt-1 break-words leading-relaxed">未知时辰仅支持前端查看，不支持保存与 AI 深度分析</p>
                                    </div>
                                    <div className="inline-flex items-start gap-2 px-3.5 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/15 dark:to-pink-900/10 border border-purple-200/60 dark:border-purple-700/30 rounded-xl text-xs text-purple-700 dark:text-purple-300 font-medium w-fit max-w-full">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="break-words leading-relaxed">请先补全出生时辰并保存命盘，再使用 AI 性格分析</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !isSaved ? (
                    <section className="bg-background rounded-xl border border-border overflow-hidden w-full max-w-full box-border shadow-sm">
                        <div className="px-4 sm:px-5 md:px-6 py-3.5 sm:py-4 md:py-5 w-full max-w-full">
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/10 border border-violet-200/60 dark:border-violet-700/30 flex-shrink-0 shadow-sm">
                                    <User className="w-4 h-4 text-[#a083ff]" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2.5 w-full max-w-full">
                                    <div>
                                        <h4 className="text-sm font-semibold text-foreground/85 break-words">AI 性格特征分析</h4>
                                        <p className="text-xs text-foreground/45 mt-1 break-words leading-relaxed">基于十神命局的深度性格画像</p>
                                    </div>
                                    <div className="inline-flex items-start gap-2 px-3.5 py-2.5 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/15 dark:to-fuchsia-900/10 border border-violet-200/60 dark:border-violet-700/30 rounded-xl text-xs text-violet-700 dark:text-violet-300 font-medium w-fit max-w-full">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                        <span className="break-words leading-relaxed">保存命盘后即可开启 AI 性格特征分析</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : !userId ? (
                    <section className="bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-pink-900/20 border border-purple-200/70 dark:border-purple-700/40 rounded-xl p-5 sm:p-7 md:p-9 text-center w-full max-w-full box-border overflow-hidden shadow-md">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <User className="w-7 h-7 text-[#a083ff]" />
                        </div>
                        <div className="space-y-2.5 w-full max-w-full">
                            <h3 className="text-base sm:text-lg font-bold text-foreground/95 break-words">AI 性格分析</h3>
                            <p className="text-sm text-foreground/55 break-words w-full max-w-full mx-auto leading-relaxed max-w-md">
                                登录后解锁基于您命盘的深度性格倾向与职场建议
                            </p>
                        </div>
                        <button
                            onClick={onLoginRequired}
                            className="mt-5 px-6 py-2.5 bg-gradient-to-r from-[#a083ff] to-[#9c64ff] text-white text-sm font-medium rounded-xl hover:from-[#8b5cf6] hover:to-[#8b5cf6] transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
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