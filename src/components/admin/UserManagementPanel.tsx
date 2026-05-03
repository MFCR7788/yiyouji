'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    Search,
    Users,
    Shield,
    ShieldOff,
    Trash2,
    Edit3,
    ChevronLeft,
    ChevronRight,
    Coins,
    Eye,
    AlertTriangle,
    Loader2,
} from 'lucide-react';
import { requestBrowserData } from '@/lib/browser-api';
import { useToast } from '@/components/ui/Toast';
import type { AdminOperationLog } from '@/lib/admin/admin-operation-logs';

type MembershipTier = 'free' | 'plus' | 'pro';

interface UserInfo {
    id: string;
    email: string;
    nickname: string | null;
    avatar_url: string | null;
    membership: MembershipTier;
    membership_expires_at: string | null;
    credits: number;
    is_admin: boolean;
    created_at: string;
    last_sign_in_at: string | null;
}

interface UserDetail extends UserInfo {
    recentTransactions: Array<{
        id: string;
        amount: number;
        type: 'earn' | 'spend' | 'refund';
        source: string;
        description: string | null;
        created_at: string;
        balance_after: number;
    }>;
    recentOperations: AdminOperationLog[];
}

interface UsersResponse {
    users: UserInfo[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const MEMBERSHIP_LABELS: Record<MembershipTier, { label: string; color: string }> = {
    free: { label: '免费版', color: 'text-gray-600 bg-gray-100' },
    plus: { label: 'Plus会员', color: 'text-blue-600 bg-blue-100' },
    pro: { label: 'Pro会员', color: 'text-purple-600 bg-purple-100' },
};

export function UserManagementPanel() {
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 搜索和筛选状态
    const [searchQuery, setSearchQuery] = useState('');
    const [membershipFilter, setMembershipFilter] = useState<MembershipTier | ''>('');
    const [isAdminFilter, setIsAdminFilter] = useState<string>('');

    // 分页状态
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    // 编辑状态
    const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
    const [editForm, setEditForm] = useState({
        nickname: '',
        membership: 'free' as MembershipTier,
        credits_adjustment: '',
        credit_reason: '',
    });
    const [saving, setSaving] = useState(false);

    // 确认对话框状态
    const [confirmDialog, setConfirmDialog] = useState<{
        show: boolean;
        type: 'disable' | 'enable' | 'delete';
        userId: string;
        userName: string;
    }>({ show: false, type: 'disable', userId: '', userName: '' });

    const { showToast } = useToast();

    // 加载用户列表
    const loadUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '20',
                ...(searchQuery && { search: searchQuery }),
                ...(membershipFilter && { membership: membershipFilter }),
                ...(isAdminFilter && { is_admin: isAdminFilter }),
            });

            const payload = await requestBrowserData<UsersResponse>(
                `/api/admin/users?${params}`,
                { method: 'GET' },
                { fallbackMessage: '获取用户列表失败' },
            );

            setUsers(payload.users || []);
            setTotalPages(payload.pagination?.totalPages || 1);
            setTotalUsers(payload.pagination?.total || 0);
            setCurrentPage(page);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, membershipFilter, isAdminFilter]);

    useEffect(() => {
        void loadUsers(1);
    }, [loadUsers]);

    // 加载用户详情
    const loadUserDetail = async (userId: string) => {
        setSelectedUserId(userId);
        setDetailLoading(true);
        try {
            const payload = await requestBrowserData<{ user: UserDetail }>(
                `/api/admin/users/${userId}`,
                { method: 'GET' },
                { fallbackMessage: '获取用户详情失败' },
            );
            setUserDetail(payload.user);
        } catch (err) {
            console.error('Failed to load user detail:', err);
            setUserDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    // 返回列表视图
    const backToList = () => {
        setSelectedUserId(null);
        setUserDetail(null);
        setEditingUser(null);
    };

    // 开始编辑用户
    const startEdit = (user: UserInfo) => {
        setEditingUser(user);
        setEditForm({
            nickname: user.nickname || '',
            membership: user.membership,
            credits_adjustment: '',
            credit_reason: '',
        });
    };

    // 取消编辑
    const cancelEdit = () => {
        setEditingUser(null);
        setEditForm({ nickname: '', membership: 'free', credits_adjustment: '', credit_reason: '' });
    };

    // 保存用户修改
    const saveUserChanges = async () => {
        if (!editingUser) return;

        setSaving(true);
        try {
            const updates: Record<string, unknown> = {};

            if (editForm.nickname !== editingUser.nickname) {
                updates.nickname = editForm.nickname;
            }

            if (editForm.membership !== editingUser.membership) {
                updates.membership = editForm.membership;
            }

            if (editForm.credits_adjustment) {
                const adjustment = Number(editForm.credits_adjustment);
                if (!isNaN(adjustment)) {
                    updates.credits_adjustment = adjustment;
                    updates.credit_reason = editForm.credit_reason || '管理员手动调整';
                }
            }

            await requestBrowserData(
                `/api/admin/users/${editingUser.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates),
                },
                { fallbackMessage: '保存用户信息失败' },
            );

            showToast('success', '用户信息已更新');
            cancelEdit();
            
            if (selectedUserId === editingUser.id) {
                await loadUserDetail(editingUser.id);
            }
            void loadUsers(currentPage);
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : '保存失败');
        } finally {
            setSaving(false);
        }
    };

    // 显示确认对话框
    const showConfirmDialog = (type: 'disable' | 'enable' | 'delete', userId: string, userName: string) => {
        setConfirmDialog({ show: true, type, userId, userName });
    };

    // 执行确认操作
    const executeConfirmedAction = async () => {
        const { type, userId } = confirmDialog;

        try {
            let url = `/api/admin/users/${userId}`;
            let method = 'POST';

            if (type === 'delete') {
                url += '?confirmed=true';
                method = 'DELETE';
            }

            await requestBrowserData(
                url,
                { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: type }) },
                { fallbackMessage: `${type === 'delete' ? '删除' : type === 'disable' ? '禁用' : '启用'}用户失败` },
            );

            const actionLabel = type === 'delete' ? '删除' : type === 'disable' ? '禁用' : '启用';
            showToast('success', `用户已${actionLabel}`);

            setConfirmDialog({ show: false, type: 'disable', userId: '', userName: '' });

            if (selectedUserId === userId) {
                backToList();
            }
            void loadUsers(currentPage);
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : '操作失败');
        }
    };

    // 格式化日期
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 格式化会员到期时间
    const formatExpiryDate = (dateStr: string | null) => {
        if (!dateStr) return '永久有效';
        return new Date(dateStr).toLocaleDateString('zh-CN');
    };

    // 渲染用户列表视图
    if (!selectedUserId) {
        return (
            <div className="space-y-6">
                {/* 标题和统计 */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-6 h-6" />
                            用户管理
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            共 {totalUsers} 名注册用户
                        </p>
                    </div>
                </div>

                {/* 搜索和筛选栏 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
                    <div className="flex flex-wrap gap-4">
                        {/* 搜索框 */}
                        <div className="flex-1 min-w-[250px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="搜索昵称或邮箱..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* 会员等级筛选 */}
                        <select
                            value={membershipFilter}
                            onChange={(e) => setMembershipFilter(e.target.value as MembershipTier | '')}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">全部等级</option>
                            <option value="free">免费版</option>
                            <option value="plus">Plus会员</option>
                            <option value="pro">Pro会员</option>
                        </select>

                        {/* 管理员筛选 */}
                        <select
                            value={isAdminFilter}
                            onChange={(e) => setIsAdminFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">全部用户</option>
                            <option value="true">仅管理员</option>
                            <option value="false">排除管理员</option>
                        </select>
                    </div>
                </div>

                {/* 用户表格 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className="ml-3 text-gray-600">加载中...</span>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>暂无用户数据</p>
                        </div>
                    ) : (
                        <>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">等级</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">积分</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img
                                                        src={user.avatar_url || '/default-avatar.png'}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full bg-gray-200"
                                                    />
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.nickname || '未设置昵称'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${MEMBERSHIP_LABELS[user.membership].color}`}>
                                                    {MEMBERSHIP_LABELS[user.membership].label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-700">
                                                    <Coins className="w-4 h-4 mr-1 text-yellow-500" />
                                                    {user.credits.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.is_admin ? (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        管理员
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500">普通用户</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(user.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => loadUserDetail(user.id)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Eye className="w-4 h-4 inline mr-1" />
                                                    查看
                                                </button>
                                                <button
                                                    onClick={() => startEdit(user)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    <Edit3 className="w-4 h-4 inline mr-1" />
                                                    编辑
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* 分页控件 */}
                            {totalPages > 1 && (
                                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button
                                            onClick={() => currentPage > 1 && loadUsers(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            上一页
                                        </button>
                                        <button
                                            onClick={() => currentPage < totalPages && loadUsers(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            下一页
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                显示第{' '}
                                                <span className="font-medium">{(currentPage - 1) * 20 + 1}</span>
                                                {' '}到{' '}
                                                <span className="font-medium">{Math.min(currentPage * 20, totalUsers)}</span>
                                                {' '}条，共{' '}
                                                <span className="font-medium">{totalUsers}</span>
                                                {' '}条
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                <button
                                                    onClick={() => currentPage > 1 && loadUsers(currentPage - 1)}
                                                    disabled={currentPage <= 1}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md ring-1 ring-inset ring-gray-300 bg-white text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 bg-white">
                                                    {currentPage} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => currentPage < totalPages && loadUsers(currentPage + 1)}
                                                    disabled={currentPage >= totalPages}
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md ring-1 ring-inset ring-gray-300 bg-white text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                                >
                                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // 渲染用户详情视图（简化版本，完整版本会很长）
    return (
        <div className="space-y-6">
            {/* 返回按钮 */}
            <button
                onClick={backToList}
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
            >
                <ChevronLeft className="w-5 h-5 mr-1" />
                返回用户列表
            </button>

            {/* 加载状态 */}
            {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-gray-600">加载用户详情...</span>
                </div>
            ) : userDetail ? (
                <div className="space-y-6">
                    {/* 用户基本信息卡片 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center">
                                <img
                                    src={userDetail.avatar_url || '/default-avatar.png'}
                                    alt=""
                                    className="w-16 h-16 rounded-full bg-gray-200"
                                />
                                <div className="ml-4">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {userDetail.nickname || '未设置昵称'}
                                    </h3>
                                    <p className="text-gray-500">{userDetail.email}</p>
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${MEMBERSHIP_LABELS[userDetail.membership].color}`}>
                                            {MEMBERSHIP_LABELS[userDetail.membership].label}
                                        </span>
                                        {userDetail.is_admin && (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                <Shield className="w-3 h-3 mr-1" />
                                                管理员
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {!editingUser && (
                                <div className="space-x-2">
                                    <button
                                        onClick={() => startEdit(userDetail)}
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        编辑
                                    </button>
                                    <button
                                        onClick={() => showConfirmDialog('disable', userDetail.id, userDetail.email)}
                                        className="inline-flex items-center px-4 py-2 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                    >
                                        <ShieldOff className="w-4 h-4 mr-2" />
                                        禁用
                                    </button>
                                    <button
                                        onClick={() => showConfirmDialog('delete', userDetail.id, userDetail.email)}
                                        className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        删除
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 统计信息 */}
                        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{userDetail.credits}</div>
                                <div className="text-sm text-gray-500 mt-1">当前积分</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {userDetail.recentTransactions?.length || 0}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">近期交易</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {formatExpiryDate(userDetail.membership_expires_at)}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">会员到期</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">
                                    {new Date(userDetail.created_at).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">注册时间</div>
                            </div>
                        </div>
                    </div>

                    {/* 编辑表单 */}
                    {editingUser && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">编辑用户信息</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                                    <input
                                        type="text"
                                        value={editForm.nickname}
                                        onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">会员等级</label>
                                    <select
                                        value={editForm.membership}
                                        onChange={(e) => setEditForm({ ...editForm, membership: e.target.value as MembershipTier })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="free">免费版</option>
                                        <option value="plus">Plus会员</option>
                                        <option value="pro">Pro会员</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">积分调整</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={editForm.credits_adjustment}
                                            onChange={(e) => setEditForm({ ...editForm, credits_adjustment: e.target.value })}
                                            placeholder="正数增加，负数减少"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={editForm.credit_reason}
                                            onChange={(e) => setEditForm({ ...editForm, credit_reason: e.target.value })}
                                            placeholder="原因（可选）"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={saveUserChanges}
                                        disabled={saving}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                                保存中...
                                            </>
                                        ) : (
                                            '保存修改'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 近期交易记录 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Coins className="w-5 h-5 mr-2" />
                            近期积分交易记录
                        </h4>
                        
                        {(userDetail.recentTransactions?.length || 0) > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">类型</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">金额</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">来源</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">说明</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">余额</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">时间</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(userDetail.recentTransactions || []).map((tx) => (
                                            <tr key={tx.id}>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`font-semibold ${
                                                        tx.type === 'earn' ? 'text-green-600' :
                                                        tx.type === 'spend' ? 'text-red-600' :
                                                        'text-gray-600'
                                                    }`}>
                                                        {tx.type === 'earn' ? '+' : tx.type === 'spend' ? '-' : ''}
                                                        {tx.type === 'earn' ? '获得' : tx.type === 'spend' ? '消费' : '退款'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono">{tx.amount}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{tx.source}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{tx.description || '-'}</td>
                                                <td className="px-4 py-3 text-sm font-mono">{tx.balance_after}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(tx.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">暂无交易记录</p>
                        )}
                    </div>

                    {/* 操作历史 */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">管理员操作历史</h4>
                        
                        {(userDetail.recentOperations?.length || 0) > 0 ? (
                            <div className="space-y-3">
                                {(userDetail.recentOperations || []).map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${
                                            log.status === 'success' ? 'bg-green-500' :
                                            log.status === 'failed' ? 'bg-red-500' :
                                            'bg-yellow-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">{log.description}</p>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                <span>{log.admin_nickname || log.admin_id.substring(0, 8)}</span>
                                                <span>{log.operation_type}</span>
                                                <span>{formatDate(log.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">暂无操作历史</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    无法加载用户详情
                </div>
            )}

            {/* 确认对话框 */}
            {confirmDialog.show && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black opacity-40" onClick={() => setConfirmDialog({ ...confirmDialog, show: false })} />
                        
                        <div className="relative bg-white rounded-lg max-w-md w-full mx-auto shadow-xl z-10 p-6">
                            <div className="text-center">
                                <AlertTriangle className="mx-auto w-12 h-12 text-yellow-500 mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    确认{confirmDialog.type === 'delete' ? '删除' : confirmDialog.type === 'disable' ? '禁用' : '启用'}用户
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    您即将{confirmDialog.type === 'delete' ? '彻底删除' : confirmDialog.type === 'disable' ? '禁用' : '启用'}用户：
                                    <strong className="text-gray-900 block mt-1">{confirmDialog.userName}</strong>
                                    {confirmDialog.type === 'delete' && (
                                        <span className="text-red-600 block mt-2">
                                            此操作不可逆！用户的所有数据将被永久删除。
                                        </span>
                                    )}
                                </p>
                                
                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={executeConfirmedAction}
                                        className={`px-4 py-2 text-white rounded-lg ${
                                            confirmDialog.type === 'delete'
                                                ? 'bg-red-600 hover:bg-red-700'
                                                : confirmDialog.type === 'disable'
                                                ? 'bg-yellow-600 hover:bg-yellow-700'
                                                : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                    >
                                        确认{confirmDialog.type === 'delete' ? '删除' : confirmDialog.type === 'disable' ? '禁用' : '启用'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
