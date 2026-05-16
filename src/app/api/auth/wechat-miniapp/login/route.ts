import { NextRequest } from 'next/server'
import { jsonOk, jsonError, getSystemAdminClient } from '@/lib/api-utils'

const WECHAT_MINIAPP_APPID = process.env.WECHAT_MINIAPP_APPID || ''
const WECHAT_MINIAPP_SECRET = process.env.WECHAT_MINIAPP_SECRET || ''

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { code } = body

        if (!code) {
            return jsonError('缺少 code 参数', 400)
        }

        const wxRes = await fetch(
            `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_MINIAPP_APPID}&secret=${WECHAT_MINIAPP_SECRET}&js_code=${code}&grant_type=authorization_code`
        )

        const wxData = await wxRes.json()

        if (wxData.errcode) {
            console.error('[wechat-miniapp-login] WeChat API error:', wxData)
            return jsonError('微信登录失败', 401)
        }

        const { openid, unionid, session_key } = wxData

        const adminClient = getSystemAdminClient()

        const { data: existingBinding } = await adminClient
            .from('user_oauth_providers')
            .select('user_id')
            .eq('provider', 'wechat_miniapp')
            .eq('provider_user_id', openid)
            .single()

        let userId: string
        let isNewUser = false

        if (existingBinding) {
            userId = existingBinding.user_id
        } else {
            const email = `wx_miniapp_${openid}@yiyouji.temp`
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                email,
                email_confirm: true,
                password: openid + '_yiyouji_' + Date.now(),
                user_metadata: {
                    nickname: '微信用户',
                    provider: 'wechat_miniapp',
                },
            })

            if (createError || !newUser?.user) {
                console.error('[wechat-miniapp-login] Create user error:', createError)
                return jsonError('创建用户失败', 500)
            }

            userId = newUser.user.id
            isNewUser = true

            await adminClient
                .from('user_oauth_providers')
                .insert({
                    user_id: userId,
                    provider: 'wechat_miniapp',
                    provider_user_id: openid,
                    provider_data: { unionid, session_key },
                })

            const { error: profileError } = await adminClient
                .from('users')
                .insert({
                    id: userId,
                    nickname: '微信用户',
                    membership: 'free',
                    ai_chat_count: 5,
                })

            if (profileError) {
                console.error('[wechat-miniapp-login] Create profile error:', profileError)
            }
        }

        const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: `wx_miniapp_${openid}@yiyouji.temp`,
        })

        if (sessionError || !sessionData) {
            console.error('[wechat-miniapp-login] Generate session error:', sessionError)
            return jsonError('生成会话失败', 500)
        }

        const { data: userData } = await adminClient
            .from('users')
            .select('id, nickname, avatar_url, membership, ai_chat_count')
            .eq('id', userId)
            .single()

        return jsonOk({
            access_token: sessionData.properties?.action_link || '',
            user: userData || { id: userId, nickname: '微信用户', membership: 'free', ai_chat_count: 5 },
            is_new_user: isNewUser,
        })
    } catch (error) {
        console.error('[wechat-miniapp-login] Error:', error)
        return jsonError('登录失败，请稍后重试', 500)
    }
}
