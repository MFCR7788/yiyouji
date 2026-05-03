import { FeatureTogglePanel } from '@/components/admin/FeatureTogglePanel';
import { KeyManagementPanel } from '@/components/admin/KeyManagementPanel';

export const metadata = {
  title: '功能与激活码 - 设置中心',
  description: '管理功能开关和激活码',
};

export default function FeatureManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">功能与激活码</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理功能开关和激活码
        </p>
      </div>

      <FeatureTogglePanel />
      <KeyManagementPanel />
    </div>
  );
}