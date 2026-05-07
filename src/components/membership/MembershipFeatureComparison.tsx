'use client';

import { Check, X } from 'lucide-react';

const FeatureRow = ({ feature, free, plus, plus_6m, pro }: {
    feature: string;
    free: string | boolean;
    plus?: string | boolean;
    plus_6m?: string | boolean;
    pro?: string | boolean;
}) => (
    <tr className="border-b border-[#ebe8e2]">
        <td className="py-3 pl-8 pr-5 text-sm text-[#37352f]/80 font-medium" style={{ paddingLeft: '2.5rem' }}>{feature}</td>
        <td className="py-3 px-4 text-center">
            {typeof free === 'string' ? (
                <span className="text-sm text-[#37352f]/60">{free}</span>
            ) : free ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            )}
        </td>
        <td className="py-3 px-4 text-center">
            {typeof plus === 'string' ? (
                <span className="text-sm text-[#37352f]/60">{plus}</span>
            ) : plus === true ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : plus === false ? (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            ) : (
                <span className="text-sm text-[#37352f]/60">-</span>
            )}
        </td>
        <td className="py-3 px-4 text-center">
            {typeof plus_6m === 'string' ? (
                <span className="text-sm font-medium text-[#e67e22]">{plus_6m}</span>
            ) : plus_6m === true ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : plus_6m === false ? (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            ) : (
                <span className="text-sm text-[#37352f]/60">-</span>
            )}
        </td>
        <td className="py-3 px-4 text-center">
            {typeof pro === 'string' ? (
                <span className="text-sm font-bold text-[#8b5cf6]">{pro}</span>
            ) : pro === true ? (
                <Check className="mx-auto h-4 w-4 text-[#1f9d6d]" />
            ) : pro === false ? (
                <X className="mx-auto h-4 w-4 text-[#37352f]/30" />
            ) : (
                <span className="text-sm text-[#37352f]/60">-</span>
            )}
        </td>
    </tr>
);

const FeatureSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <>
        <tr>
            <td colSpan={5} className="py-4">
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
                            <th className="py-3 px-5 text-left text-xs font-semibold text-[#37352f]/70 w-[30%]">功能</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#37352f]/70 w-[17%]">免费版</th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#37352f]/70 w-[17%]">Plus<br/><span className="text-[10px] font-normal">3个月</span></th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#e67e22] w-[18%]">Plus<br/><span className="text-[10px] font-normal text-[#e67e22]">6个月</span></th>
                            <th className="py-3 px-4 text-center text-xs font-semibold text-[#8b5cf6] w-[18%]">Pro<br/><span className="text-[10px] font-normal text-[#8b5cf6]">1年</span></th>
                        </tr>
                    </thead>
                    <tbody className="px-5">
                        <FeatureSection title="积分权益">
                            <FeatureRow 
                                feature="每日签到积分"
                                free="+10积分"
                                plus="+10积分"
                                plus_6m="+10积分"
                                pro="+10积分"
                            />
                            <FeatureRow
                                feature="积分上限"
                                free="10"
                                plus="200"
                                plus_6m="500"
                                pro="1200"
                            />
                            <FeatureRow 
                                feature="购买赠送积分"
                                free="-"
                                plus="+200积分"
                                plus_6m="+500积分"
                                pro="+1200积分"
                            />
                        </FeatureSection>
                        <FeatureSection title="AI 模型">
                            <FeatureRow 
                                feature="基础 AI 模型"
                                free={true}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="Plus 专属模型"
                                free={false}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="Pro 专属模型"
                                free={false}
                                plus={false}
                                plus_6m={false}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="推理模式（思考）"
                                free={false}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="占卜分析">
                            <FeatureRow 
                                feature="基础命盘排盘"
                                free={true}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="每日/月运势预览"
                                free={true}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="塔罗、六爻、MBTI 解读"
                                free={true}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="全部 AI 分析功能"
                                free={false}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="知识库">
                            <FeatureRow 
                                feature="知识库基础搜索"
                                free={false}
                                plus={true}
                                plus_6m={true}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="知识库向量搜索"
                                free={false}
                                plus={false}
                                plus_6m={false}
                                pro={true}
                            />
                            <FeatureRow 
                                feature="知识库智能重排序"
                                free={false}
                                plus={false}
                                plus_6m={false}
                                pro={true}
                            />
                        </FeatureSection>
                        <FeatureSection title="价格">
                            <FeatureRow 
                                feature="月均价格"
                                free="¥0"
                                plus="¥28"
                                plus_6m="¥28"
                                pro="¥21.5"
                            />
                            <FeatureRow 
                                feature="优惠周期"
                                free="永久"
                                plus="3个月"
                                plus_6m="6个月"
                                pro="12个月"
                            />
                        </FeatureSection>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
