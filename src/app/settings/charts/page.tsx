import ChartsPanel from '@/components/settings/panels/ChartsPanel';

export const metadata = {
  title: '命盘管理 - 设置中心',
  description: '查看和管理你的命盘数据',
};

export default function ChartsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">命盘</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理八字、紫微等命盘数据
        </p>
      </div>

      <ChartsPanel />
    </div>
  );
}
