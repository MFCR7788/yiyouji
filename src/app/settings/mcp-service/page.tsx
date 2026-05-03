import McpServicePanel from '@/components/settings/panels/McpServicePanel';

export const metadata = {
  title: 'MCP 服务 - 设置中心',
  description: '配置和管理 MCP (Model Context Protocol) 服务',
};

export default function McpServiceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">MCP</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理 MCP 服务连接和配置
        </p>
      </div>

      <McpServicePanel />
    </div>
  );
}
