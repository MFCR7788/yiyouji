import { AIModelPanel } from '@/components/admin/AIModelPanel';
import { AIGatewayPanel } from '@/components/admin/AIGatewayPanel';

export const metadata = {
  title: 'AI 服务 - 设置中心',
  description: '管理 AI 模型和网关配置',
};

export default function AIServiceManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI 服务</h2>
        <p className="mt-1 text-sm text-foreground-secondary">
          管理 AI 模型和网关配置
        </p>
      </div>

      <AIModelPanel />
      <AIGatewayPanel />
    </div>
  );
}