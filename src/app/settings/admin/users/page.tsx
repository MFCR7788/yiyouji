import { UserManagementPanel } from '@/components/admin/UserManagementPanel';

export const metadata = {
  title: '用户管理 - 设置中心',
  description: '管理系统用户和权限',
};

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">用户管理</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理系统用户、会员等级、积分和账户状态
        </p>
      </div>

      <UserManagementPanel />
    </div>
  );
}