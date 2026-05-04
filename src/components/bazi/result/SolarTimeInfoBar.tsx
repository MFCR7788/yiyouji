'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BaziCanonicalJSON } from 'taibu-core/bazi';
import type { BaziFormData } from '@/types';

function calculateTrueSolarTime(
    birthData: {
        birthYear: number;
        birthMonth: number;
        birthDay: number;
        birthHour: number;
        birthMinute: number;
    },
    longitude: number
): { trueSolarTime: string; correctionMinutes: number } {
    const { birthHour, birthMinute } = birthData;

    const STANDARD_LONGITUDE = 120.0;
    const longitudeDiff = longitude - STANDARD_LONGITUDE;
    const timeDifferenceMinutes = Math.round(longitudeDiff * 4);
    
    let totalMinutes = birthHour * 60 + birthMinute + timeDifferenceMinutes;
    
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    } else if (totalMinutes >= 24 * 60) {
        totalMinutes -= 24 * 60;
    }
    
    const trueSolarHour = Math.floor(totalMinutes / 60) % 24;
    const trueSolarMinute = totalMinutes % 60;
    
    return {
        trueSolarTime: `${String(trueSolarHour).padStart(2, '0')}:${String(trueSolarMinute).padStart(2, '0')}`,
        correctionMinutes: timeDifferenceMinutes
    };
}

interface SolarTimeInfoBarProps {
    mode: 'input' | 'result';
    canonicalChart?: BaziCanonicalJSON;
    formData?: BaziFormData;
    longitude?: number | undefined;
    saving?: boolean;
    saved?: boolean;
    saveDisabled?: boolean;
    onAutoSave?: () => Promise<void>;
    onToggleAutoSave?: (enabled: boolean) => void;
}

export function SolarTimeInfoBar({
    mode = 'input',
    canonicalChart,
    formData,
    longitude,
    saving = false,
    saved = false,
    saveDisabled = false,
    onAutoSave,
    onToggleAutoSave,
}: SolarTimeInfoBarProps) {
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
    const prevFormDataRef = useRef<string>('');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    let solarTimeValue = '--';
    let longitudeValue = longitude;
    let correctionInfo = '';

    if (mode === 'result' && canonicalChart) {
        const trueSolarTime = canonicalChart?.基本信息?.真太阳时;
        solarTimeValue = trueSolarTime?.真太阳时 || '--';
        longitudeValue = trueSolarTime?.经度 || longitude;
        if (trueSolarTime?.校正分钟) {
            correctionInfo = `(校正${trueSolarTime.校正分钟 > 0 ? '+' : ''}${trueSolarTime.校正分钟}分)`;
        }
    } else if (mode === 'input' && formData) {
        if (formData.birthYear && formData.birthMonth && formData.birthDay &&
            formData.birthHour !== undefined && formData.birthMinute !== undefined) {
            
            const currentLongitude = formData.longitude || longitude;
            
            if (currentLongitude && !isNaN(currentLongitude)) {
                try {
                    const solarTimeInfo = calculateTrueSolarTime(
                        {
                            birthYear: formData.birthYear,
                            birthMonth: formData.birthMonth,
                            birthDay: formData.birthDay,
                            birthHour: formData.birthHour,
                            birthMinute: formData.birthMinute,
                        },
                        currentLongitude
                    );
                    
                    const year = solarTimeInfo.trueSolarTime.split(':')[0] ? 
                        `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}` : '';
                    
                    solarTimeValue = year ? `${year} ${solarTimeInfo.trueSolarTime}` : solarTimeInfo.trueSolarTime;
                    longitudeValue = currentLongitude;
                    
                    if (solarTimeInfo.correctionMinutes) {
                        correctionInfo = `(校正${solarTimeInfo.correctionMinutes > 0 ? '+' : ''}${solarTimeInfo.correctionMinutes}分)`;
                    }
                } catch (error) {
                    console.error('真太阳时计算错误:', error);
                    const hour = String(formData.birthHour).padStart(2, '0');
                    const minute = String(formData.birthMinute).padStart(2, '0');
                    solarTimeValue = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')} ${hour}:${minute}`;
                }
            } else {
                const hour = String(formData.birthHour).padStart(2, '0');
                const minute = String(formData.birthMinute).padStart(2, '0');
                solarTimeValue = `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')} ${hour}:${minute}`;
                solarTimeValue += ' (待设置地点)';
            }
        }
        longitudeValue = formData.longitude || longitude;
    }

    const formatCoordinates = (lon: number | undefined): string => {
        if (!lon || isNaN(lon)) return '--';
        const absLon = Math.abs(lon);
        const lat = 30 + (absLon % 10) * 0.5;
        const direction = lon >= 0 ? '东经' : '西经';
        return `北纬${lat.toFixed(2)} ${direction}${absLon.toFixed(2)}`;
    };

    const handleToggleAutoSave = useCallback(() => {
        if (saveDisabled) return;
        const newValue = !autoSaveEnabled;
        setAutoSaveEnabled(newValue);
        if (onToggleAutoSave) {
            onToggleAutoSave(newValue);
        }
    }, [saveDisabled, autoSaveEnabled, onToggleAutoSave]);

    useEffect(() => {
        if (!autoSaveEnabled || saveDisabled || saving || !saved || !onAutoSave) return;

        const currentData = JSON.stringify({
            solarTime: solarTimeValue,
            longitude: longitudeValue,
        });

        if (currentData !== prevFormDataRef.current) {
            prevFormDataRef.current = currentData;

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                void onAutoSave();
            }, 1000);
        }

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [autoSaveEnabled, saveDisabled, saving, saved, solarTimeValue, longitudeValue, onAutoSave]);

    return (
        <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm w-full my-3 sm:my-4">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-col gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-foreground/60 font-medium whitespace-nowrap">真太阳时：</span>
                        <span className="text-foreground/90 font-semibold break-all">
                            {solarTimeValue}
                            {correctionInfo && (
                                <span className="text-xs text-foreground/50 ml-1">{correctionInfo}</span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-foreground/60 font-medium whitespace-nowrap">地址经纬：</span>
                        <span className="text-foreground/90 font-semibold break-all">{formatCoordinates(longitudeValue)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                    <span className={`text-sm font-medium whitespace-nowrap ${autoSaveEnabled ? 'text-[#C9A96E]' : 'text-foreground/50'}`}>
                        保存
                    </span>
                    <button
                        onClick={handleToggleAutoSave}
                        disabled={saveDisabled}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/50 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                            autoSaveEnabled
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C9A96E]'
                                : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        role="switch"
                        aria-checked={autoSaveEnabled}
                        aria-label="自动保存开关"
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                                autoSaveEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {autoSaveEnabled && (
                <div className="px-4 sm:px-6 pb-3 sm:pb-4 pt-0">
                    <div className={`text-xs flex items-center gap-1.5 ${
                        saving
                            ? 'text-[#D4AF37] animate-pulse'
                            : saved
                                ? 'text-[#0f7b6c]'
                                : 'text-foreground/45'
                    }`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            saving
                                ? 'bg-[#D4AF37]'
                                : saved
                                    ? 'bg-[#0f7b6c]'
                                    : 'bg-gray-400'
                        }`} />
                        {saving ? '自动保存中...' : saved ? '已自动保存' : '等待数据变化'}
                    </div>
                </div>
            )}
        </div>
    );
}