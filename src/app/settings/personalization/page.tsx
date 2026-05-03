import AISettingsPanel from '@/components/settings/panels/AISettingsPanel';

export const metadata = {
  title: '个性化设置 - 设置中心',
  description: '自定义 AI 行为和个性化偏好',
};

export default function PersonalizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">个性化</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          配置 AI 模型行为和个性化选项
        </p>
      </div>

      <AISettingsPanel />
    </div>
  );
}
