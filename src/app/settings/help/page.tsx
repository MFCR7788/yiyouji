import HelpPanel from '@/components/settings/panels/HelpPanel';

export const metadata = {
  title: '帮助中心 - 设置中心',
  description: '获取使用帮助和技术支持',
};

export default function HelpSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">帮助</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          使用指南、常见问题和反馈渠道
        </p>
      </div>

      <HelpPanel />
    </div>
  );
}
