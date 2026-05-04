'use client';

import { Check, X } from 'lucide-react';
import { pricingPlans, type PricingPlan } from '@/lib/user/membership';

const FeatureRow = ({ feature, free, plus, pro }: {
    feature: string;
    free: string | boolean;
    plus: string | boolean;
    pro: string | boolean;
}) => (
    <tr className="border-b border-[#ebe8e2]">
        <td className="py-3 text-sm text-[#37352f]/80 font-medium">{feature}</td>
        <td className="py-3 text-center">
            {typeof free === 'string' ? (
                <span className="text-sm text-[#37352f]/60">{free}</span>
            ) : free ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            )}
        </td>
        <td className="py-3 text-center">
            {typeof plus === 'string' ? (
                <span className="text-sm text-[#37352f]/60">{plus}</span>
            ) : plus ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            )}
        </td>
        <td className="py-3 text-center">
            {typeof pro === 'string' ? (
                <span className="text-sm text-[#37352f]/60">{pro}</span>
            ) : pro ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            )}
        </td>
    </tr>
);

const FeatureSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <>
        <tr>
            <td colSpan={4} className="py-4">
                <h4 className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider">{title}</h4>
            </td>
        </tr>
        {children}
    </>
);

export function MembershipFeatureComparison() {
    return (
        <div className="overflow-hidden rounded-xl border border-[#ebe8e2] bg-white">
            <div className="border-b border-[#ebe8e2] bg-[#f7f6f3] px-5 py-4">
                <h3 className="text-sm font-semibold text-[#37352f]">会员功能对比</h3>
                <p className="text-xs text-[#37352f]/50">详细了解不同会员等级的权益差异</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#ebe8e2]">
                            <th className="py-3 px-5 text-left text-xs font-semibold text-[#37352f]/70 w-[35%]">功能</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#37352f]/70 w-[20%]">免费版</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#37352f]/70 w-[20%]">Plus</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#37352f]/70 w-[20%]">Pro</th>
                        </tr>
                    </thead>
                    <tbody className="px-5">
                        <FeatureSection title="积分权益">
                            <FeatureRow 
                                feature="每日签到积分"
                                free="+10积分"
                                plus="+10积分"
                                pro="+10积分"
                            />
                            <FeatureRow 
                                feature="积分上限"
                                free="10"
                                plus="500"
                                pro="1000"
                            />
                        </FeatureSection>
                        <FeatureSection title="AI 模型">
                            <FeatureRow 
                                feature="基础 AI 模型"
                                free={true}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="Plus 专属模型"
                                free={false}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="Pro 专属模型"
                                free={false}
                                plus={false}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="推理模式（思考）"
                                free={false}
                                plus={true}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="占卜分析">
                            <FeatureRow 
                                feature="基础命盘排盘"
                                free={true}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="每日/月运势预览"
                                free={true}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="塔罗、六爻、MBTI 解读"
                                free={true}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="全部 AI 分析功能"
                                free={false}
                                plus={true}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="知识库">
                            <FeatureRow 
                                feature="知识库基础搜索"
                                free={false}
                                plus={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="知识库向量搜索"
                                free={false}
                                plus={false}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="知识库智能重排序"
                                free={false}
                                plus={false}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="价格">
                            <FeatureRow 
                                feature="月均价格"
                                free="¥0"
                                plus="¥28"
                                pro="¥21.5"
                            />
                            <FeatureRow 
                                feature="优惠周期"
                                free="永久"
                                plus="6个月"
                                pro="12个月"
                            />
                        </FeatureSection>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
