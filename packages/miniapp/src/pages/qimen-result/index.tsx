import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'
export default function QimenResultPage() {
  const params = Taro.getCurrentInstance().router?.params
  let result: any = null
  try { result = params?.data ? JSON.parse(decodeURIComponent(params.data)) : null } catch { /* ignore */ }
  return (<View className='result-page'><View className='result-card'><Text className='result-title'>奇门遁甲结果</Text><Text className='result-summary'>{result?.summary || '排盘完成'}</Text></View><Button className='ai-btn' onClick={() => Taro.showToast({ title: 'AI 解读开发中', icon: 'none' })}>AI 深度解读</Button></View>)
}
