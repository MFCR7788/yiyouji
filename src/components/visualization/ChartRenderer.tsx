'use client';

import { lazy, Suspense, Component, type ReactNode, useMemo, useState } from 'react';
import type { ChartData, ChartType } from '@/lib/visualization/chart-types';
import { normalizeChartData } from '@/lib/visualization/chart-data-extract';

const chartComponents: Record<ChartType, ReturnType<typeof lazy>> = {
  life_fortune_trend: lazy(() => import('./charts/LifeFortuneTrend')),
  fortune_radar: lazy(() => import('./charts/FortuneRadar')),
  fortune_calendar: lazy(() => import('./charts/FortuneCalendar')),
  wuxing_energy: lazy(() => import('./charts/WuxingEnergyChart')),
  life_timeline: lazy(() => import('./charts/LifeTimeline')),
  compatibility_gauge: lazy(() => import('./charts/CompatibilityGauge')),
  divination_verdict: lazy(() => import('./charts/DivinationVerdict')),
  mbti_spectrum: lazy(() => import('./charts/MBTISpectrum')),
  tarot_elements: lazy(() => import('./charts/TarotElements')),
  personality_petal: lazy(() => import('./charts/PersonalityPetal')),
  yearly_sparklines: lazy(() => import('./charts/YearlySparklines')),
  physiognomy_annotation: lazy(() => import('./charts/PhysiognomyAnnotation')),
  fortune_comparison: lazy(() => import('./charts/FortuneComparison')),
  cross_system: lazy(() => import('./charts/CrossSystemCard')),
  dream_association: lazy(() => import('./charts/DreamAssociation')),
};

interface ChartRendererProps {
  data: ChartData;
  compact?: boolean;
  className?: string;
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 sm:py-12 min-h-[200px] sm:min-h-[250px] w-full max-w-full">
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--color-accent)]/20 animate-pulse" />
      <div className="flex flex-col items-center gap-2 w-full px-8 sm:px-12">
        <div className="h-2.5 w-3/5 rounded-full bg-[var(--color-accent)]/15 animate-pulse" />
        <div className="h-2.5 w-2/5 rounded-full bg-[var(--color-accent)]/10 animate-pulse" style={{ animationDelay: '150ms' }} />
      </div>
      <div className="h-20 sm:h-24 w-4/5 sm:w-3/4 rounded-lg bg-[var(--color-accent)]/10 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

interface ErrorBoundaryState {
  error: Error | null;
}

export function shouldResetChartError(prevResetKey: unknown, nextResetKey: unknown): boolean {
  return prevResetKey !== nextResetKey;
}

class ChartErrorBoundary extends Component<{ children: ReactNode; resetKey: unknown }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    console.error('[ChartErrorBoundary] 图表渲染错误:', error);
    return { error };
  }

  componentDidUpdate(prevProps: Readonly<{ children: ReactNode; resetKey: unknown }>) {
    if (this.state.error && shouldResetChartError(prevProps.resetKey, this.props.resetKey)) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6 text-center w-full max-w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-lg sm:text-xl text-red-400">⚠</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">图表渲染出错</p>
              <p className="mt-1 text-xs text-red-400 max-w-[280px] mx-auto break-words">{this.state.error.message}</p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ChartRenderer({ data, compact = false, className = '' }: ChartRendererProps) {
  const normalizedData = useMemo(() => normalizeChartData(data), [data]);
  const [retryCount, setRetryCount] = useState(0);
  const ChartComponent = chartComponents[normalizedData.chartType as ChartType];

  if (!ChartComponent) {
    return (
      <div className={`rounded-xl border border-[var(--color-border)] p-4 sm:p-6 text-center text-xs sm:text-sm text-[var(--color-foreground-secondary)] ${className} w-full max-w-full`}>
        <p>暂不支持的图表类型</p>
        <code className="mt-1 block text-xs opacity-60 break-all">{normalizedData.chartType}</code>
      </div>
    );
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const resetKey = `${normalizedData.chartType}-${JSON.stringify(normalizedData).slice(0, 100)}-${retryCount}`;

  return (
    <div className={`w-full max-w-full overflow-hidden ${className}`}>
      <ChartErrorBoundary key={resetKey} resetKey={resetKey}>
        <Suspense fallback={<ChartSkeleton />}>
          <ChartComponent data={normalizedData as any} compact={compact} className="w-full max-w-full" />
        </Suspense>
      </ChartErrorBoundary>
    </div>
  );
}
