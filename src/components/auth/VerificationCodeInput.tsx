/**
 * 验证码输入组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useRef, useEffect)
 * - 有键盘导航和粘贴交互功能
 */
'use client';

import { useRef, useEffect, KeyboardEvent, ClipboardEvent, useCallback } from 'react';

interface VerificationCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
}

/**
 * 清理粘贴的文本：只保留数字，去除空格和其他特殊字符
 */
const sanitizePastedText = (text: string, maxLength: number): string => {
    // 去除所有非数字字符
    let sanitized = text.replace(/\D/g, '');
    // 去除空格
    sanitized = sanitized.replace(/\s/g, '');
    // 限制长度
    return sanitized.slice(0, maxLength);
};

export function VerificationCodeInput({
    value,
    onChange,
    onComplete,
    length = 6,
    disabled = false,
    autoFocus = false,
}: VerificationCodeInputProps) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const lastFocusIndexRef = useRef(0);

    // 当值填满时自动触发完成回调
    useEffect(() => {
        if (value.length === length && onComplete) {
            onComplete(value);
        }
    }, [value, length, onComplete]);

    const handleChange = useCallback((index: number, char: string) => {
        // 只允许数字
        const digit = char.replace(/\D/g, '').slice(0, 1);
        if (!digit && char !== '') return;

        const newValue = value.split('');
        newValue[index] = digit;
        const result = newValue.join('').slice(0, length);
        onChange(result);

        // 自动跳转到下一个输入框
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
            lastFocusIndexRef.current = index + 1;
        }
    }, [value, length, onChange]);

    const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
        lastFocusIndexRef.current = index;
        
        if (e.key === 'Backspace') {
            if (!value[index] && index > 0) {
                // 当前格为空，删除上一格并聚焦
                const newValue = value.split('');
                newValue[index - 1] = '';
                onChange(newValue.join(''));
                inputRefs.current[index - 1]?.focus();
                lastFocusIndexRef.current = index - 1;
            } else {
                // 删除当前格
                const newValue = value.split('');
                newValue[index] = '';
                onChange(newValue.join(''));
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
            lastFocusIndexRef.current = index - 1;
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
            lastFocusIndexRef.current = index + 1;
            e.preventDefault();
        }
    }, [value, length, onChange]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // 获取粘贴的文本
            const pastedText = e.clipboardData.getData('text');
            
            // 清理文本
            const sanitized = sanitizePastedText(pastedText, length);
            
            if (sanitized && sanitized.length > 0) {
                // 从当前位置开始填充，或者从开头填充
                let newValue: string[];
                
                if (sanitized.length >= length) {
                    // 如果粘贴的内容足够长，直接替换全部
                    newValue = sanitized.slice(0, length).split('');
                } else {
                    // 从当前位置开始填充
                    newValue = value.split('');
                    for (let i = 0; i < sanitized.length && (index + i) < length; i++) {
                        newValue[index + i] = sanitized[i];
                    }
                    // 确保不超过长度限制
                    newValue = newValue.slice(0, length);
                }
                
                const result = newValue.join('');
                onChange(result);
                
                // 聚焦到最后一个填入的位置或最后一格
                const focusIndex = Math.min(
                    sanitized.length >= length ? length - 1 : index + sanitized.length,
                    length - 1
                );
                
                // 确保聚焦的索引有效
                const finalFocusIndex = Math.max(0, Math.min(focusIndex, length - 1));
                
                // 使用 setTimeout 确保 DOM 更新后再聚焦
                setTimeout(() => {
                    if (inputRefs.current[finalFocusIndex]) {
                        inputRefs.current[finalFocusIndex]?.focus();
                        inputRefs.current[finalFocusIndex]?.select();
                    }
                }, 10);
            }
        } catch (error) {
            console.error('[VerificationCodeInput] 粘贴处理失败:', error);
        }
    }, [value, length, onChange]);

    const handleFocus = useCallback((index: number) => {
        lastFocusIndexRef.current = index;
        // 聚焦时选中内容
        if (inputRefs.current[index]) {
            setTimeout(() => {
                inputRefs.current[index]?.select();
            }, 0);
        }
    }, []);

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length }).map((_, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={value[index] || ''}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={(e) => handlePaste(e, index)}
                    onFocus={() => handleFocus(index)}
                    disabled={disabled}
                    autoFocus={index === 0 && autoFocus}
                    className="w-10 h-12 text-center text-xl font-mono rounded-lg bg-background-secondary border border-border focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all disabled:opacity-50"
                />
            ))}
        </div>
    );
}
