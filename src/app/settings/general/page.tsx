import GeneralSettingsPanel from '@/components/settings/panels/GeneralSettingsPanel';

export const metadata = {
  title: '常规设置 - 设置中心',
  description: '管理语言、主题、通知等基础偏好设置',
};

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">常规设置</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理你的基础偏好和应用程序行为
        </p>
      </div>

      <GeneralSettingsPanel />
    </div>
  );
}
