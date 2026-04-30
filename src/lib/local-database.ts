/**
 * 本地开发数据库模拟
 * 当无法连接远程数据库时使用内存存储
 */

import type { MingRecord, MingNote } from './records';
import type { ConversationListItem, ChatMessage, Conversation, AIPersonality } from '@/types';

// 使用全局对象存储，防止模块热更新导致数据丢失
const globalKey = '__LOCAL_DB__';

interface LocalDbState {
    recordsStore: Record<string, MingRecord[]>;
    notesStore: Record<string, MingNote[]>;
    conversationsStore: Record<string, Conversation[]>;
    recordIdCounter: number;
    noteIdCounter: number;
    conversationIdCounter: number;
    mockUsers: Record<string, {
        id: string;
        nickname: string | null;
        avatar_url: string | null;
        is_admin: boolean;
        membership: string;
        membership_expires_at: string | null;
        ai_chat_count: number;
    }>;
    baziCharts: Record<string, Record<string, unknown>>;
    ziweiCharts: Record<string, Record<string, unknown>>;
}

type GlobalThisWithLocalDb = typeof globalThis & {
    __LOCAL_DB__?: LocalDbState;
}

function getDbState(): LocalDbState {
    const globalWithDb = globalThis as GlobalThisWithLocalDb;
    if (!globalWithDb[globalKey]) {
        globalWithDb[globalKey] = {
            recordsStore: {},
            notesStore: {},
            conversationsStore: {},
            recordIdCounter: 1,
            noteIdCounter: 1,
            conversationIdCounter: 1,
            mockUsers: {
                'dev-user-id': {
                    id: 'dev-user-id',
                    nickname: '开发用户',
                    avatar_url: null,
                    is_admin: true,
                    membership: 'pro',
                    membership_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    ai_chat_count: 999,
                },
            },
            baziCharts: {},
            ziweiCharts: {},
        };
    }
    return globalWithDb[globalKey]!;
}

const dbState = getDbState();
const recordsStore = dbState.recordsStore;
const notesStore = dbState.notesStore;
const conversationsStore = dbState.conversationsStore;

function generateId(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            result += '-';
        } else {
            result += chars[Math.floor(Math.random() * 16)];
        }
    }
    return result;
}

export function getLocalRecords(userId: string): { records: MingRecord[]; total: number } {
    const records = recordsStore[userId] || [];
    return { records, total: records.length };
}

export function createLocalRecord(userId: string, data: Partial<MingRecord>): MingRecord {
    const record: MingRecord = {
        id: generateId(),
        user_id: userId,
        title: data.title || '新记录',
        content: data.content || null,
        category: data.category || 'general',
        tags: data.tags || [],
        event_date: data.event_date || null,
        related_chart_type: data.related_chart_type || null,
        related_chart_id: data.related_chart_id || null,
        is_pinned: data.is_pinned || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (!recordsStore[userId]) {
        recordsStore[userId] = [];
    }
    recordsStore[userId].unshift(record);
    return record;
}

export function getLocalNotes(userId: string, date: string): MingNote[] {
    const notes = notesStore[userId] || [];
    return notes.filter(note => note.note_date === date);
}

export function createLocalNote(userId: string, data: { content: string; note_date?: string; mood?: string | null }): MingNote {
    const note: MingNote = {
        id: generateId(),
        user_id: userId,
        note_date: data.note_date || new Date().toISOString().split('T')[0],
        content: data.content,
        mood: (data.mood as MingNote['mood']) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (!notesStore[userId]) {
        notesStore[userId] = [];
    }
    notesStore[userId].push(note);
    return note;
}

export function getLocalConversations(userId: string, limit: number, offset: number): { conversations: ConversationListItem[]; pagination: { hasMore: boolean; nextOffset: number | null } } {
    const conversations = (conversationsStore[userId] || []).slice(offset, offset + limit);
    const allConversations = conversationsStore[userId] || [];
    const hasMore = offset + limit < allConversations.length;

    const items: ConversationListItem[] = conversations.map(c => ({
        id: c.id,
        userId: c.userId,
        personality: c.personality,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        sourceType: c.sourceType,
        questionPreview: c.messages[0]?.content?.substring(0, 50) || null,
        isArchived: false,
        archivedKbIds: [],
    }));

    return {
        conversations: items,
        pagination: {
            hasMore,
            nextOffset: hasMore ? offset + limit : null,
        },
    };
}

export function createLocalConversation(userId: string, data: { personality?: string; title?: string; messages?: ChatMessage[] }): Conversation {
    const conversation: Conversation = {
        id: generateId(),
        userId,
        personality: (data.personality || 'general') as import('@/types').AIPersonality,
        title: data.title || '新对话',
        messages: data.messages || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceType: 'chat',
        sourceData: undefined,
        isArchived: false,
        archivedKbIds: [],
    };

    if (!conversationsStore[userId]) {
        conversationsStore[userId] = [];
    }
    conversationsStore[userId].unshift(conversation);
    return conversation;
}

export function saveLocalConversation(userId: string, conversationId: string, messages: ChatMessage[], title?: string): boolean {
    const conversations = conversationsStore[userId];
    if (!conversations) return false;

    const index = conversations.findIndex(c => c.id === conversationId);
    if (index === -1) return false;

    conversations[index] = {
        ...conversations[index],
        messages,
        title: title || conversations[index].title,
        updatedAt: new Date().toISOString(),
    };
    return true;
}

export function updateLocalConversation(userId: string, conversationId: string, updates: { title?: string; messages?: ChatMessage[]; personality?: string }): boolean {
    const conversations = conversationsStore[userId];
    if (!conversations) return false;

    const index = conversations.findIndex(c => c.id === conversationId);
    if (index === -1) return false;

    conversations[index] = {
        ...conversations[index],
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.messages !== undefined && { messages: updates.messages }),
        ...(updates.personality !== undefined && { personality: updates.personality as import('@/types').AIPersonality }),
        updatedAt: new Date().toISOString(),
    } as Conversation;
    return true;
}

export function getLocalConversation(userId: string, conversationId: string): Conversation | null {
    const conversations = conversationsStore[userId];
    if (!conversations) return null;
    return conversations.find(c => c.id === conversationId) || null;
}

export function deleteLocalConversation(userId: string, conversationId: string): boolean {
    const conversations = conversationsStore[userId];
    if (!conversations) return false;

    const index = conversations.findIndex(c => c.id === conversationId);
    if (index === -1) return false;

    conversations.splice(index, 1);
    return true;
}

// 模拟数据
export function initMockData() {
    const mockUserId = 'mock_user_id';

    if (!recordsStore[mockUserId]) {
        recordsStore[mockUserId] = [
            {
                id: 'mock_record_1',
                user_id: mockUserId,
                title: '测试记录 1',
                content: '这是一条测试记录',
                category: 'general',
                tags: ['测试', '重要'],
                event_date: '2026-04-26',
                related_chart_type: null,
                related_chart_id: null,
                is_pinned: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                id: 'mock_record_2',
                user_id: mockUserId,
                title: '测试记录 2',
                content: '这是另一条测试记录',
                category: 'event',
                tags: ['事件'],
                event_date: '2026-04-25',
                related_chart_type: null,
                related_chart_id: null,
                is_pinned: false,
                created_at: new Date(Date.now() - 86400000).toISOString(),
                updated_at: new Date(Date.now() - 86400000).toISOString(),
            },
        ];
    }

    if (!conversationsStore[mockUserId]) {
        conversationsStore[mockUserId] = [
            {
                id: 'mock_conv_1',
                userId: mockUserId,
                personality: 'general',
                title: '测试对话',
                messages: [
                    {
                        id: 'msg_1',
                        role: 'user',
                        content: '你好',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'msg_2',
                        role: 'assistant',
                        content: '您好！我是易有吉 AI，很高兴为您服务。',
                        createdAt: new Date().toISOString(),
                    },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sourceType: 'chat',
                sourceData: undefined,
                isArchived: false,
                archivedKbIds: [],
            },
        ];
    }
}

const DEV_USER_ID = 'dev-user-id';

function getOrCreateMockUser(userId: string) {
    if (!dbState.mockUsers[userId]) {
        // 从 userId 中提取手机号（格式：dev-user-13800138000）
        const phoneMatch = userId.match(/^dev-user-(\d+)$/);
        const phone = phoneMatch ? phoneMatch[1] : null;

        dbState.mockUsers[userId] = {
            id: userId,
            nickname: phone ? `用户${phone.slice(-4)}` : '开发用户',
            avatar_url: null,
            is_admin: true,
            membership: 'pro',
            membership_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            ai_chat_count: 999,
        };
    }
    return dbState.mockUsers[userId];
}

type MockQueryResult<T = Record<string, unknown> | Record<string, unknown>[]> = {
    data: T | null;
    error: null;
    count?: number | null;
};

function createMockSelectChain(userId: string, tableName: string, selectOpts?: { count?: string }) {
    const filters: Array<{ column: string; value: unknown; op: string }> = [];

    const resolveData = (): Record<string, unknown> | null => {
        if (tableName === 'users') {
            let targetUserId: string | null = null;

            for (const f of filters) {
                if (f.op === 'eq' && f.column === 'id') {
                    targetUserId = f.value as string;
                    break;
                }
            }

            if (!targetUserId) {
                targetUserId = userId;
            }

            const user = getOrCreateMockUser(targetUserId);
            return user as unknown as Record<string, unknown>;
        }
        if (tableName === 'user_settings') {
            const settings = {
                user_id: userId,
                expression_style: 'direct',
                chart_prompt_detail_level: 'default',
                custom_instructions: '',
                prompt_kb_ids: [],
            };
            return settings;
        }
        if (tableName === 'bazi_charts' || tableName === 'ziwei_charts') {
            const db = getDbState();
            const store = tableName === 'bazi_charts' ? db.baziCharts : db.ziweiCharts;
            
            let targetId: string | null = null;
            
            for (const f of filters) {
                if (f.op === 'eq' && f.column === 'id') {
                    targetId = f.value as string;
                    break;
                }
            }
            
            if (targetId && store[targetId]) {
                return store[targetId];
            }
            
            return null;
        }
        return null;
    };

    interface MockQueryChain {
    eq(column: string, value: unknown): MockQueryChain;
    gte(column: string, value: unknown): MockQueryChain;
    lte(column: string, value: unknown): MockQueryChain;
    neq(column: string, value: unknown): MockQueryChain;
    in(column: string, values: unknown[]): MockQueryChain;
    like(column: string, pattern: string): MockQueryChain;
    ilike(column: string, pattern: string): MockQueryChain;
    is(column: string, value: unknown): MockQueryChain;
    maybeSingle(): MockQueryResult;
    single(): MockQueryResult;
    limit(n: number): MockQueryChain;
    range(start: number, end: number): MockQueryResult<Record<string, unknown>[]>;
    order(column: string, opts?: { ascending?: boolean }): MockQueryChain;
    then<T>(executor: (value: MockQueryResult<Record<string, unknown>[]>) => T, reject?: (reason: unknown) => T): Promise<T>;
    select(columns?: string, opts?: { count?: string }): MockQueryChain & { count?: number };
}

const chain: MockQueryChain = {
        eq(column: string, value: unknown) {
            filters.push({ column, value, op: 'eq' });
            return chain;
        },
        gte(_column: string, _value: unknown) {
            return chain;
        },
        lte(_column: string, _value: unknown) {
            return chain;
        },
        neq(_column: string, _value: unknown) {
            return chain;
        },
        in(_column: string, _values: unknown[]) {
            return chain;
        },
        like(_column: string, _pattern: string) {
            return chain;
        },
        ilike(_column: string, _pattern: string) {
            return chain;
        },
        is(_column: string, _value: unknown) {
            return chain;
        },
        maybeSingle(): MockQueryResult {
            return { data: resolveData(), error: null };
        },
        single(): MockQueryResult {
            return { data: resolveData(), error: null };
        },
        limit(_n: number) {
            return chain;
        },
        range(_start: number, _end: number): MockQueryResult<Record<string, unknown>[]> {
            return { data: [], error: null };
        },
        order(_column: string, _opts?: { ascending?: boolean }) {
            return chain;
        },
        then<T>(executor: (value: MockQueryResult<Record<string, unknown>[]>) => T, _reject?: (reason: unknown) => T): Promise<T> {
            const hasIdFilter = filters.some(f => f.op === 'eq' && f.column === 'id');
            
            if (hasIdFilter) {
                const data = resolveData();
                return Promise.resolve({ data: data ? [data] : [], error: null }).then(executor) as Promise<T>;
            }
            
            if (tableName === 'bazi_charts' || tableName === 'ziwei_charts') {
                const db = getDbState();
                const store = tableName === 'bazi_charts' ? db.baziCharts : db.ziweiCharts;
                const allRecords = Object.values(store);
                
                const userIdFilter = filters.find(f => f.op === 'eq' && f.column === 'user_id');
                if (userIdFilter) {
                    const filtered = allRecords.filter(rec => rec.user_id === userIdFilter.value);
                    return Promise.resolve({ data: filtered, error: null }).then(executor) as Promise<T>;
                }
                
                return Promise.resolve({ data: allRecords, error: null }).then(executor) as Promise<T>;
            }
            
            const data = resolveData();
            return Promise.resolve({ data: data ? [data] : [], error: null }).then(executor) as Promise<T>;
        },
        select(_columns?: string, opts?: { count?: string }) {
            if (opts?.count) {
                const result = resolveData();
                return {
                    ...chain,
                    count: result ? 1 : 0,
                    maybeSingle(): MockQueryResult & { count: number | null } {
                        return { data: resolveData(), error: null, count: result ? 1 : 0 };
                    },
                    single(): MockQueryResult & { count: number | null } {
                        return { data: resolveData(), error: null, count: result ? 1 : 0 };
                    },
                };
            }
            return chain;
        },
    };

    if (selectOpts?.count === 'exact') {
        const result = resolveData();
        (chain as MockQueryChain & { count: number }).count = result ? 1 : 0;
    }

    return chain;
}

function createMockFrom(userId: string, tableName: string) {
    return {
        select(_columns?: string, opts?: { count?: string; head?: boolean }) {
            if (opts?.head) {
                const result = createMockSelectChain(userId, tableName, opts);
                const data = (result.maybeSingle?.() ?? { data: null }) as MockQueryResult;
                return {
                    ...result,
                    count: data.data ? 1 : 0,
                    maybeSingle(): MockQueryResult & { count: number | null } {
                        return { data: null, error: null, count: data.data ? 1 : 0 };
                    },
                };
            }
            return createMockSelectChain(userId, tableName, opts);
        },
        update(_payload: Record<string, unknown>) {
            interface MockUpdateChain {
                eq(column: string, value: string): MockUpdateChain;
                maybeSingle(): MockQueryResult;
                select(columns?: string): MockUpdateChain;
            }
            const updateChain: MockUpdateChain = {
                eq(_column: string, _value: string) {
                    return updateChain;
                },
                maybeSingle(): MockQueryResult {
                    const user = getOrCreateMockUser(userId);
                    return { data: user as unknown as Record<string, unknown>, error: null };
                },
                select(_columns?: string) {
                    return updateChain;
                },
            };
            return updateChain;
        },
        upsert(_payload: Record<string, unknown>, _opts?: { onConflict?: string }) {
            return { error: null };
        },
        insert(rows: Record<string, unknown>[]) {
            const db = getDbState();
            const newId = `mock-${tableName}-${Date.now()}`;
            
            // 存储数据
            if (tableName === 'bazi_charts' || tableName === 'ziwei_charts') {
                const store = tableName === 'bazi_charts' ? db.baziCharts : db.ziweiCharts;
                const rowsArray = Array.isArray(rows) ? rows : [rows];
                for (const row of rowsArray) {
                    const chartData = { 
                        ...row, 
                        id: newId, 
                        user_id: userId,
                        created_at: new Date().toISOString(), 
                        updated_at: new Date().toISOString() 
                    };
                    store[newId] = chartData;
                }
            }
            
            interface MockInsertChain {
                select(columns?: string): MockInsertChain;
                maybeSingle(): MockQueryResult;
                maybeSingleAsync(): Promise<MockQueryResult>;
                single(): MockQueryResult;
                then<T>(executor: (value: MockQueryResult) => T, reject?: (reason: unknown) => T): Promise<T>;
            }
            const insertChain: MockInsertChain = {
                select(_columns?: string) {
                    return insertChain;
                },
                maybeSingle(): MockQueryResult {
                    return { data: { id: newId }, error: null };
                },
                maybeSingleAsync(): Promise<MockQueryResult> {
                    return Promise.resolve({ data: { id: newId }, error: null });
                },
                single(): MockQueryResult {
                    return { data: { id: newId }, error: null };
                },
                then<T>(executor: (value: MockQueryResult) => T, _reject?: (reason: unknown) => T): Promise<T> {
                    return Promise.resolve({ data: { id: newId }, error: null }).then(executor) as Promise<T>;
                },
            };
            return insertChain;
        },
        delete() {
            interface MockDeleteChain {
                eq(column: string, value: string): MockDeleteChain;
                in(column: string, values: string[]): MockDeleteChain;
            }
            const deleteChain: MockDeleteChain = {
                eq(_column: string, _value: string) {
                    return deleteChain;
                },
                in(_column: string, _values: string[]) {
                    return deleteChain;
                },
            };
            return deleteChain;
        },
    };
}

export function createDevSupabaseClient(userId: string = DEV_USER_ID) {
    return {
        from(tableName: string) {
            return createMockFrom(userId, tableName);
        },
        rpc(fn: string, params?: Record<string, unknown>) {
            if (fn === 'decrement_ai_chat_count') {
                const user = getOrCreateMockUser(userId);
                if (user.ai_chat_count > 0) {
                    user.ai_chat_count -= 1;
                }
                return Promise.resolve({ data: user.ai_chat_count, error: null });
            }
            if (fn === 'increment_ai_chat_count') {
                const user = getOrCreateMockUser(userId);
                const amount = (params?.amount as number) || 1;
                user.ai_chat_count += amount;
                return Promise.resolve({ data: user.ai_chat_count, error: null });
            }
            if (fn === 'create_conversation_with_messages' || fn === 'create_analysis_conversation_with_history_as_service') {
                const db = getDbState();
                const newId = generateId();
                
                if (!db.conversationsStore[userId]) {
                    db.conversationsStore[userId] = [];
                }
                
                db.conversationsStore[userId].unshift({
                    id: newId,
                    userId,
                    personality: (params?.p_personality as AIPersonality) || 'general',
                    title: (params?.p_title as string) || '新对话',
                    messages: (params?.p_messages as ChatMessage[]) || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    sourceType: (params?.p_source_type as string) as ConversationListItem['sourceType'] || 'chat',
                    sourceData: params?.p_source_data as Record<string, unknown> | undefined,
                    isArchived: false,
                    archivedKbIds: [],
                });
                
                return Promise.resolve({ data: newId, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        },
        auth: {
            getUser(_token?: string) {
                const user = getOrCreateMockUser(userId);
                return Promise.resolve({
                    data: {
                        user: {
                            id: userId,
                            email: userId.includes('@') ? userId : `user_${userId.replace('dev-user-', '')}@mingai.fun`,
                            app_metadata: {},
                            user_metadata: { nickname: user.nickname },
                            aud: 'authenticated',
                            role: 'authenticated',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    },
                    error: null,
                });
            },
        },
    };
}
