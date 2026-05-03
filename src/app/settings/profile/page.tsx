import ProfilePanel from '@/components/settings/panels/ProfilePanel';

export const metadata = {
  title: '账户设置 - 设置中心',
  description: '管理个人信息和账户安全',
};

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">账户</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理你的个人信息和账户设置
        </p>
      </div>

      <ProfilePanel />
    </div>
  );
}
