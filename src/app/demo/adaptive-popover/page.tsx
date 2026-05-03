/**
 * AdaptivePopover 演示页面
 *
 * 展示组件的所有功能和响应式特性
 */
'use client';

import { useState } from 'react';
import {
  Settings,
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  HelpCircle,
  ChevronRight,
  Check,
} from 'lucide-react';
import { AdaptivePopover } from '@/components/ui/AdaptivePopover';

export default function AdaptivePopoverDemo() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        {/* 页面标题 */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            AdaptivePopover 组件
          </h1>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            自适应弹出层组件 — 智能切换菜单模式与对话框模式，
            完美适配桌面端、平板和移动设备
          </p>
        </div>

        {/* 示例网格 */}
        <div className="grid gap-12 md:grid-cols-2">

          {/* 示例1：基础菜单 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" />
              基础菜单（自动模式）
            </h2>
            <p className="text-sm text-foreground-secondary">
              根据屏幕尺寸自动选择显示模式（桌面=菜单，移动=对话框）
            </p>

            <div className="flex justify-center p-12 rounded-xl border-2 border-dashed border-border bg-background-secondary/30">
              <AdaptivePopover
                trigger={<span>设置菜单</span>}
                ariaLabel="设置选项"
              >
                <nav className="space-y-1">
                  {[
                    { icon: User, label: '账户设置', desc: '管理个人信息' },
                    { icon: Bell, label: '通知偏好', desc: '自定义通知' },
                    { icon: Palette, label: '外观主题', desc: '切换深色/浅色' },
                    { icon: Globe, label: '语言区域', desc: '选择语言' },
                    { icon: Shield, label: '隐私安全', desc: '安全设置' },
                    { icon: HelpCircle, label: '帮助中心', desc: '使用指南' },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedOption(item.label)}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selectedOption === item.label
                          ? 'bg-accent/10 text-accent'
                          : 'hover:bg-background-secondary text-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-foreground-secondary">{item.desc}</div>
                      </div>
                      {selectedOption === item.label && (
                        <Check className="h-4 w-4 text-accent shrink-0" />
                      )}
                    </button>
                  ))}
                </nav>
              </AdaptivePopover>
            </div>

            {selectedOption && (
              <div className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
                ✓ 已选择：{selectedOption}
              </div>
            )}
          </section>

          {/* 示例2：带模式切换 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" />
              可切换模式
            </h2>
            <p className="text-sm text-foreground-secondary">
              显示模式切换按钮，用户可手动在菜单和对话框之间切换
            </p>

            <div className="flex justify-center p-12 rounded-xl border-2 border-dashed border-border bg-background-secondary/30">
              <AdaptivePopover
                trigger={<span>高级设置</span>}
                ariaLabel="高级设置面板"
                showModeToggle={true}
                width={380}
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">显示名称</label>
                    <input
                      type="text"
                      placeholder="输入你的名称"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">语言偏好</label>
                    <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                      <option>简体中文</option>
                      <option>English</option>
                      <option>日本語</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">启用通知推送</span>
                    <button
                      type="button"
                      role="switch"
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent transition-colors"
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6 transition-transform" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
                  >
                    保存设置
                  </button>
                </div>
              </AdaptivePopover>
            </div>
          </section>

          {/* 示例3：不同位置 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" />
              多种定位方式
            </h2>
            <p className="text-sm text-foreground-secondary">
              支持 top/bottom/left/right 四个方向，以及 start/center/end 对齐
            </p>

            <div className="grid grid-cols-2 gap-4 p-8 rounded-xl border-2 border-dashed border-border bg-background-secondary/30">
              <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-foreground-secondary">底部居中（默认）</span>
                <AdaptivePopover
                  trigger={<span>Bottom</span>}
                  position="bottom"
                  align="center"
                  ariaLabel="底部菜单"
                  width={200}
                >
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-3 py-2 rounded hover:bg-background-secondary text-sm cursor-pointer">
                        选项 {i}
                      </div>
                    ))}
                  </div>
                </AdaptivePopover>
              </div>

              <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-foreground-secondary">右侧对齐</span>
                <AdaptivePopover
                  trigger={<span>Right End</span>}
                  position="bottom"
                  align="end"
                  ariaLabel="右对齐菜单"
                  width={200}
                >
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-3 py-2 rounded hover:bg-background-secondary text-sm cursor-pointer">
                        选项 {i}
                      </div>
                    ))}
                  </div>
                </AdaptivePopover>
              </div>

              <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-foreground-secondary">顶部对齐</span>
                <AdaptivePopover
                  trigger={<span>Top Start</span>}
                  position="top"
                  align="start"
                  ariaLabel="顶部菜单"
                  width={200}
                >
                  <div className="space-y-2 p-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-3 py-2 rounded hover:bg-background-secondary text-sm cursor-pointer">
                        选项 {i}
                      </div>
                    ))}
                  </div>
                </AdaptivePopover>
              </div>

              <div className="flex flex-col items-center gap-4">
                <span className="text-xs text-foreground-secondary">自动定位</span>
                <AdaptivePopover
                  trigger={<span>Auto</span>}
                  position="auto"
                  ariaLabel="智能定位菜单"
                  width={220}
                >
                  <div className="p-3 text-sm text-foreground-secondary">
                    自动选择空间最大的方向展开
                  </div>
                </AdaptivePopover>
              </div>
            </div>
          </section>

          {/* 示例4：强制对话框模式 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" />
              强制对话框模式
            </h2>
            <p className="text-sm text-foreground-secondary">
              无论屏幕大小都使用全屏对话框，适合复杂表单或重要操作
            </p>

            <div className="flex justify-center p-12 rounded-xl border-2 border-dashed border-border bg-background-secondary/30">
              <AdaptivePopover
                trigger={<span>确认操作</span>}
                mode="dialog"
                ariaLabel="重要确认"
                maxWidth={500}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-sm mb-1">需要确认</h3>
                      <p className="text-xs text-foreground-secondary">
                        此操作将影响你的账户设置，请仔细阅读以下信息后确认。
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-foreground-secondary shrink-0" />
                      <span>此操作不可撤销</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-foreground-secondary shrink-0" />
                      <span>将清除所有本地缓存数据</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-foreground-secondary shrink-0" />
                      <span>需要重新登录账户</span>
                    </li>
                  </ul>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-background-secondary transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      确认执行
                    </button>
                  </div>
                </div>
              </AdaptivePopover>
            </div>
          </section>

        </div>

        {/* 特性说明 */}
        <section className="mt-16 space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center">核心特性</h2>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🎯 双模式智能切换
              </h3>
              <p className="text-sm text-foreground-secondary">
                根据屏幕尺寸自动选择最优展示方式：
                桌面端使用紧凑的悬浮菜单，移动端切换为全屏对话框。
                也支持手动切换按钮让用户自主选择。
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                📐 智能定位算法
              </h3>
              <p className="text-sm text-foreground-secondary">
                自动计算最佳弹出位置，实时检测视口边界，
                防止内容被截断或超出可视区域。支持 4 个方向 × 3 种对齐 = 12 种组合。
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                ✨ 流畅动画系统
              </h3>
              <p className="text-sm text-foreground-secondary">
                使用 CSS Animations + cubic-bezier 缓动函数，
                实现丝滑的展开/收起过渡效果。可自定义动画时长和缓动曲线。
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                📱 完美多设备适配
              </h3>
              <p className="text-sm text-foreground-secondary">
                响应式断点系统确保在桌面、平板、手机上都有最佳体验。
                触摸友好的大点击区域，符合各平台交互规范。
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                ♿ 无障碍性支持
              </h3>
              <p className="text-sm text-foreground-secondary">
                内置 ARIA 属性、键盘导航（ESC 关闭）、焦点管理。
                支持屏幕阅读器，符合 WCAG 2.1 AA 标准。
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-background-secondary/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                🔧 高度可定制
              </h3>
              <p className="text-sm text-foreground-secondary">
                灵活的 API 设计，支持受控/非受控模式、多种宽度策略、
                自定义样式类名。轻松集成到任何设计系统。
              </p>
            </div>
          </div>
        </section>

        {/* 使用示例代码 */}
        <section className="mt-16 space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">快速开始</h2>

          <div className="max-w-3xl mx-auto rounded-xl border border-border bg-background-secondary/30 overflow-hidden">
            <div className="border-b border-border px-6 py-3 bg-background-secondary/50">
              <code className="text-sm font-mono">基础用法</code>
            </div>
            <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
              <code>{`import { AdaptivePopover } from '@/components/ui/AdaptivePopover';

<AdaptivePopover
  trigger={<button>打开菜单</button>}
  ariaLabel="我的菜单"
>
  <div className="p-4">
    <p>这里是弹出内容</p>
  </div>
</AdaptivePopover>`}</code>
            </pre>
          </div>
        </section>

      </div>
    </div>
  );
}
