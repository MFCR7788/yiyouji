'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';

interface SettingsLoginRequiredProps {
  title?: string;
  description?: string;
}

export function SettingsLoginRequired({
  title = '请先登录',
  description = '登录后即可使用个性化设置、命盘管理和知识库等个人能力。',
}: SettingsLoginRequiredProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-background-secondary text-foreground/70">
        <Lock className="h-4 w-4" />
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowAuthModal(true)}
          className="inline-flex items-center rounded-md border border-accent bg-accent px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent/90"
        >
          立即登录
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-background-secondary active:bg-background-tertiary"
        >
          返回首页
        </Link>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
