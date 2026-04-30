/**
 * 开发模式配置
 * 用于本地开发时模拟数据库操作
 */

import { initMockData } from './local-database';

export const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true';
export const IS_DEV_MODE = process.env.NODE_ENV === 'development';

export function initDevMode() {
    if (USE_LOCAL_DB) {
        console.log('🚀 初始化开发模式 - 使用本地内存数据库');
        initMockData();
    } else if (IS_DEV_MODE) {
        console.log('🚀 运行在开发模式 - 连接真实数据库');
    }
}
