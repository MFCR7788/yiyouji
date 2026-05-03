/**
 * AdaptivePopover - 自适应弹出层组件
 *
 * 特性：
 * - 双模式：菜单模式（紧凑）vs 对话框模式（全功能）
 * - 响应式：根据屏幕尺寸自动切换显示模式
 * - 智能定位：自动计算最佳位置，避免内容溢出视口
 * - 流畅动画：CSS transitions + JS 控制
 * - 多设备适配：桌面/平板/移动端完美支持
 *
 * 'use client' 说明：
 * - 使用 React hooks 管理状态
 * - 需要访问 DOM API 进行位置计算
 * - 处理窗口 resize 和滚动事件
 */
'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';

type Position = 'top' | 'bottom' | 'left' | 'right' | 'auto';
type Align = 'start' | 'center' | 'end';
type Mode = 'auto' | 'menu' | 'dialog';
type WidthStrategy = number | 'trigger' | 'full' | 'auto';

interface AdaptivePopoverProps {
  /** 触发元素（按钮/图标等） */
  trigger: ReactNode;
  /** 弹出层内容 */
  children: ReactNode;
  /** 显示模式：auto=自动检测屏幕尺寸 */
  mode?: Mode;
  /** 响应式断点(px)，低于此值使用对话框模式 */
  breakpoint?: number;
  /** 弹出位置 */
  position?: Position;
  /** 对齐方式 */
  align?: Align;
  /** 与触发元素的间距(px) */
  offset?: number;
  /** 宽度策略 */
  width?: WidthStrategy;
  /** 最大宽度(px) */
  maxWidth?: number;
  /** 最大高度(px) */
  maxHeight?: number;
  /** 受控模式：是否打开 */
  open?: boolean;
  /** 状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 点击外部是否关闭 */
  closeOnOutsideClick?: boolean;
  /** ESC键是否关闭 */
  closeOnEscape?: boolean;
  /** 动画时长(ms) */
  animationDuration?: number;
  /** 无障碍标签 */
  ariaLabel?: string;
  /** ARIA role */
  role?: 'menu' | 'dialog' | 'listbox';
  /** 自定义类名 */
  className?: string;
  /** 是否显示模式切换按钮 */
  showModeToggle?: boolean;
}

interface PopoverPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

export function AdaptivePopover({
  trigger,
  children,
  mode = 'auto',
  breakpoint = 768,
  position: preferredPosition = 'bottom',
  align = 'center',
  offset = 8,
  width = 'auto',
  maxWidth = 420,
  maxHeight = 480,
  open: controlledOpen,
  onOpenChange,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  animationDuration = 200,
  ariaLabel = '弹出菜单',
  role = 'menu',
  className = '',
  showModeToggle = false,
}: AdaptivePopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<Mode>('menu');
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({ top: 0, left: 0, transformOrigin: 'center' });
  const [isAnimating, setIsAnimating] = useState(false);
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // 响应式检测
  useEffect(() => {
    if (mode !== 'auto') {
      setCurrentMode(mode);
      return;
    }

    const checkScreenSize = () => {
      const isMobile = window.innerWidth < breakpoint;
      setCurrentMode(isMobile ? 'dialog' : 'menu');
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [mode, breakpoint]);

  // 计算弹出层位置
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let finalPosition: Position = preferredPosition;
    
    // 自动选择最佳位置
    if (preferredPosition === 'auto') {
      const spaceBelow = viewportHeight - triggerRect.bottom - offset;
      const spaceAbove = triggerRect.top - offset;
      const spaceRight = viewportWidth - triggerRect.right - offset;
      const spaceLeft = triggerRect.left - offset;
      
      // 选择空间最大的方向
      const spaces = [
        { pos: 'bottom' as Position, space: spaceBelow },
        { pos: 'top' as Position, space: spaceAbove },
        { pos: 'right' as Position, space: spaceRight },
        { pos: 'left' as Position, space: spaceLeft },
      ];
      
      spaces.sort((a, b) => b.space - a.space);
      finalPosition = spaces[0].pos;
    }

    let top = 0;
    let left = 0;
    let transformOrigin = 'center';

    switch (finalPosition) {
      case 'bottom':
        top = triggerRect.bottom + offset;
        switch (align) {
          case 'start':
            left = triggerRect.left;
            transformOrigin = 'top left';
            break;
          case 'center':
            left = triggerRect.left + (triggerRect.width - Math.min(popoverRect.width, maxWidth)) / 2;
            transformOrigin = 'top center';
            break;
          case 'end':
            left = triggerRect.right - Math.min(popoverRect.width, maxWidth);
            transformOrigin = 'top right';
            break;
        }
        break;

      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        switch (align) {
          case 'start':
            left = triggerRect.left;
            transformOrigin = 'bottom left';
            break;
          case 'center':
            left = triggerRect.left + (triggerRect.width - Math.min(popoverRect.width, maxWidth)) / 2;
            transformOrigin = 'bottom center';
            break;
          case 'end':
            left = triggerRect.right - Math.min(popoverRect.width, maxWidth);
            transformOrigin = 'bottom right';
            break;
        }
        break;

      case 'right':
        left = triggerRect.right + offset;
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        transformOrigin = 'left center';
        break;

      case 'left':
        left = triggerRect.left - popoverRect.width - offset;
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        transformOrigin = 'right center';
        break;
    }

    // 边界检测和修正
    if (left < 8) left = 8;
    if (left + Math.min(popoverRect.width, maxWidth) > viewportWidth - 8) {
      left = viewportWidth - Math.min(popoverRect.width, maxWidth) - 8;
    }
    if (top < 8) top = 8;
    if (top + popoverRect.height > viewportHeight - 8) {
      top = viewportHeight - popoverRect.height - 8;
    }

    setPopoverPos({ top, left, transformOrigin });
  }, [preferredPosition, align, offset, maxWidth]);

  const handleOpen = useCallback(() => {
    if (!isControlled) {
      setInternalOpen(true);
    }
    onOpenChange?.(true);
  }, [isControlled, onOpenChange]);

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setIsAnimating(true);
      setTimeout(() => {
        setInternalOpen(false);
        setIsAnimating(false);
      }, animationDuration);
    } else {
      onOpenChange?.(false);
    }
  }, [isControlled, onOpenChange, animationDuration]);

  const toggleMode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMode(prev => prev === 'menu' ? 'dialog' : 'menu');
  }, []);

  // 打开时计算位置
  useEffect(() => {
    if (isOpen) {
      // 延迟一帧确保DOM已渲染
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [isOpen, calculatePosition]);

  // 窗口resize时重新计算
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen, calculatePosition]);

  // ESC键关闭
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeOnEscape, isOpen, handleClose]);

  // 点击外部关闭
  useEffect(() => {
    if (!closeOnOutsideClick || !isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    // 延迟绑定，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnOutsideClick, isOpen, handleClose]);

  const [triggerWidth, setTriggerWidth] = useState(0);

  // 计算宽度样式
  const widthStyle = useMemo(() => {
    if (typeof width === 'number') {
      return { width: `${width}px` };
    }
    switch (width) {
      case 'trigger':
        return triggerWidth > 0 
          ? { width: `${triggerWidth}px` }
          : {};
      case 'full':
        return { width: `${window.innerWidth - 32}px`, maxWidth: 'none' };
      case 'auto':
      default:
        return { maxWidth: `${maxWidth}px` };
    }
  }, [width, maxWidth, triggerWidth]);

  // 更新触发器宽度
  useEffect(() => {
    if (triggerRef.current && isOpen) {
      requestAnimationFrame(() => {
        setTriggerWidth(triggerRef.current?.offsetWidth ?? 0);
      });
    }
  }, [isOpen]);

  // 渲染触发器
  const renderTrigger = () => (
    <button
      ref={triggerRef}
      type="button"
      onClick={handleOpen}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
        isOpen
          ? 'bg-accent/10 text-accent ring-2 ring-accent/20'
          : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
      } ${className}`}
      aria-expanded={isOpen}
      aria-haspopup={role === 'menu' || role === 'listbox'}
      aria-label={ariaLabel}
    >
      {trigger}
      <ChevronDown
        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
  );

  // 渲染菜单模式
  const renderMenuMode = () => (
    <div
      ref={popoverRef}
      role={role}
      className={`
        fixed z-[1000] rounded-xl border border-border bg-background shadow-2xl
        overflow-hidden animate-pop-in
        ${isAnimating ? 'animate-pop-out' : ''}
      `}
      style={{
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
        ...widthStyle,
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        transformOrigin: popoverPos.transformOrigin,
        animationDuration: `${animationDuration}ms`,
      }}
    >
      {/* 头部（可选） */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background-secondary/50">
        <span className="text-sm font-semibold text-foreground">{ariaLabel}</span>
        <div className="flex items-center gap-1">
          {showModeToggle && (
            <button
              type="button"
              onClick={toggleMode}
              className="rounded-md p-1.5 text-foreground-secondary hover:bg-background hover:text-foreground transition-colors"
              title="切换到对话框模式"
              aria-label="切换显示模式"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1.5 text-foreground-secondary hover:bg-background hover:text-foreground transition-colors"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );

  // 渲染对话框模式
  const renderDialogMode = () => (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        style={{ animationDuration: `${animationDuration}ms` }}
      />

      {/* 对话框主体 */}
      <div
        ref={popoverRef}
        role={role}
        className={`
          fixed inset-x-4 top-[10%] z-[1001] mx-auto max-w-lg
          rounded-2xl border border-border bg-background shadow-2xl
          animate-dialog-in overflow-hidden
          ${isAnimating ? 'animate-dialog-out' : ''}
        `}
        style={{
          maxHeight: `${window.innerHeight * 0.8}px`,
          animationDuration: `${animationDuration}ms`,
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background-secondary/50">
          <span className="text-base font-semibold text-foreground">{ariaLabel}</span>
          <div className="flex items-center gap-1">
            {showModeToggle && (
              <button
                type="button"
                onClick={toggleMode}
                className="rounded-md p-2 text-foreground-secondary hover:bg-background hover:text-foreground transition-colors"
                title="切换到菜单模式"
                aria-label="切换显示模式"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-2 text-foreground-secondary hover:bg-background hover:text-foreground transition-colors"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: `calc(${window.innerHeight * 0.8}px - 73px)` }}>
          {children}
        </div>
      </div>
    </>
  );

  if (!isOpen && !isAnimating) {
    return renderTrigger();
  }

  return (
    <>
      {renderTrigger()}

      {createPortal(
        currentMode === 'menu' ? renderMenuMode() : renderDialogMode(),
        document.body
      )}
    </>
  );
}

// 导出子组件类型（用于复杂场景）
export type { AdaptivePopoverProps };
