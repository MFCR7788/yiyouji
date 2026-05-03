import { AnnouncementManagementPanel } from '@/components/admin/AnnouncementManagementPanel';

export const metadata = {
  title: '公告管理 - 设置中心',
  description: '管理系统公告和通知',
};

export default function AnnouncementManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">公告管理</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理系统公告和通知
        </p>
      </div>

      <AnnouncementManagementPanel />
    </div>
  );
}