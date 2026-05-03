'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Settings,
  CreditCard,
  Sparkles,
  HelpCircle,
  Palette,
  BookOpen,
  Server,
  Menu,
  X,
  ChevronRight,
  Key,
  Megaphone,
  Wallet,
  Bot,
  Wrench,
  Users,
} from 'lucide-react';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

interface SettingsLayoutProps {
  children: ReactNode;
}

const SETTINGS_NAV_ITEMS = [
  {
    id: 'general',
    label: '常规',
    icon: Settings,
    href: '/settings/general',
    group: 'account',
    description: '语言、主题等基础设置',
  },
  {
    id: 'profile',
    label: '账户',
    icon: User,
    href: '/settings/profile',
    group: 'account',
    description: '个人信息管理',
  },
  {
    id: 'upgrade',
    label: '订阅',
    icon: CreditCard,
    href: '/settings/upgrade',
    group: 'account',
    description: '会员订阅管理',
    featureId: 'upgrade',
  },
  {
    id: 'help',
    label: '帮助',
    icon: HelpCircle,
    href: '/settings/help',
    group: 'account',
    description: '使用帮助与反馈',
    featureId: 'help',
  },
  {
    id: 'personalization',
    label: '个性化',
    icon: Palette,
    href: '/settings/personalization',
    group: 'extensions',
    description: 'AI 个性化配置',
    featureId: 'ai-personalization',
  },
  {
    id: 'byok',
    label: '自定义模型',
    icon: Key,
    href: '/settings/byok',
    group: 'extensions',
    description: '自定义 AI 模型配置',
  },
  {
    id: 'charts',
    label: '命盘',
    icon: Sparkles,
    href: '/settings/charts',
    group: 'extensions',
    description: '命盘管理',
    featureId: 'charts',
  },
  {
    id: 'knowledge-base',
    label: '知识库',
    icon: BookOpen,
    href: '/settings/knowledge-base',
    group: 'extensions',
    description: '知识库管理',
    featureId: 'knowledge-base',
  },
  {
    id: 'mcp-service',
    label: 'MCP',
    icon: Server,
    href: '/settings/mcp-service',
    group: 'extensions',
    description: 'MCP 服务配置',
    featureId: 'mcp-service',
  },
];

const ADMIN_NAV_ITEMS = [
  {
    id: 'admin-announcements',
    label: '公告',
    icon: Megaphone,
    href: '/settings/admin/announcements',
    group: 'management',
    description: '管理系统公告',
  },
  {
    id: 'admin-features',
    label: '功能与激活码',
    icon: Wallet,
    href: '/settings/admin/features',
    group: 'management',
    description: '功能开关与激活码管理',
  },
  {
    id: 'admin-ai-services',
    label: 'AI 服务',
    icon: Bot,
    href: '/settings/admin/ai-services',
    group: 'management',
    description: 'AI 服务配置',
  },
  {
    id: 'admin-mcp',
    label: 'MCP 管理',
    icon: Wrench,
    href: '/settings/admin/mcp',
    group: 'management',
    description: 'MCP 服务管理',
  },
  {
    id: 'admin-users',
    label: '用户管理',
    icon: Users,
    href: '/settings/admin/users',
    group: 'management',
    description: '用户账户管理',
  },
];

type NavGroup = 'account' | 'extensions' | 'management';

const GROUP_LABELS: Record<NavGroup, string> = {
  account: '账户设置',
  extensions: '功能扩展',
  management: '管理',
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isFeatureEnabled, loaded: featureLoaded } = useFeatureToggles();
  const { profile } = useCurrentUserProfile({ enabled: true });
  const isAdmin = profile?.is_admin === true;

  const filteredNavItems = SETTINGS_NAV_ITEMS.filter((item) => {
    if (item.featureId && featureLoaded && !isFeatureEnabled(item.featureId)) {
      return false;
    }
    return true;
  });

  const allNavItems = isAdmin ? [...filteredNavItems, ...ADMIN_NAV_ITEMS] : filteredNavItems;

  const groupedItems = allNavItems.reduce(
    (acc, item) => {
      const group = item.group as NavGroup;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {} as Record<NavGroup, typeof filteredNavItems>,
  );

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-border lg:bg-background-secondary lg:overflow-y-auto">
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">设置</h1>
        </div>

        <nav className="space-y-6 p-4">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
                {GROUP_LABELS[group as NavGroup]}
              </h2>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-accent/10 text-accent'
                          : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* 主内容区域 */}
      <main className="lg:pl-64 min-h-screen">
        {/* 顶部标题栏（移动端） */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 lg:px-8 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-foreground-secondary hover:bg-background-secondary"
            aria-label="打开菜单"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">设置</h1>
          <div className="w-10" />
        </header>

        {/* 页面内容 */}
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>

      {/* 移动端侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏抽屉 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-background-secondary shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">设置</h1>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-foreground-secondary hover:bg-background-secondary"
            aria-label="关闭菜单"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="space-y-6 p-4 overflow-y-auto pb-20">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
                {GROUP_LABELS[group as NavGroup]}
              </h2>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-accent/10 text-accent'
                          : 'text-foreground-secondary hover:bg-background-tertiary hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {active && <ChevronRight className="h-4 w-4" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
