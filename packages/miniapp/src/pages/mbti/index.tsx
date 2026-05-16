import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'
export default function MbtiPage() {
  return (<View className='divination-form'><View className='form-card'><Text className='form-title'>MBTI 性格测试</Text><Text className='form-desc'>回答问题，了解你的性格类型</Text></View><Button className='submit-btn' onClick={() => Taro.showToast({ title: 'MBTI 测试开发中', icon: 'none' })}>开始测试</Button></View>)
}
