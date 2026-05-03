import KnowledgeBasePanel from '@/components/settings/panels/KnowledgeBasePanel';

export const metadata = {
  title: '知识库管理 - 设置中心',
  description: '管理和配置个性化知识库',
};

export default function KnowledgeBaseSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">知识库</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理你的 AI 知识库内容
        </p>
      </div>

      <KnowledgeBasePanel />
    </div>
  );
}
