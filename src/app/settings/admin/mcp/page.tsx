import { McpKeyManagementPanel } from '@/components/admin/McpKeyManagementPanel';

export const metadata = {
  title: 'MCP 管理 - 设置中心',
  description: '管理 MCP 服务和密钥',
};

export default function MCPManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">MCP 管理</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理 MCP 服务和密钥
        </p>
      </div>

      <McpKeyManagementPanel />
    </div>
  );
}