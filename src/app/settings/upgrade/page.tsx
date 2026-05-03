import UpgradePanel from '@/components/settings/panels/UpgradePanel';

export const metadata = {
  title: '订阅管理 - 设置中心',
  description: '查看和管理你的会员订阅',
};

export default function UpgradeSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">订阅</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理你的会员订阅和计费信息
        </p>
      </div>

      <UpgradePanel />
    </div>
  );
}
