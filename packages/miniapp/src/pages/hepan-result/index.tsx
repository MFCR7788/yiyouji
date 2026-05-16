import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'
export default function HepanResultPage() {
  return (<View className='result-page'><View className='result-card'><Text className='result-title'>合盘结果</Text><Text className='result-summary'>合盘分析完成</Text></View><Button className='ai-btn' onClick={() => Taro.showToast({ title: 'AI 解读开发中', icon: 'none' })}>AI 深度解读</Button></View>)
}
