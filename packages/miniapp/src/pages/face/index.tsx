import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import '../common-divination.scss'
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'https://yiyouji.zjsifan.com'
export default function FacePage() {
  const handleChooseImage = async () => {
    const token = Taro.getStorageSync('access_token')
    if (!token) { Taro.navigateTo({ url: '/pages/login/index' }); return }
    try {
      const { tempFilePaths } = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      Taro.navigateTo({ url: `/pages/bazi-result/index?data=${encodeURIComponent(JSON.stringify({ type: 'face', image: tempFilePaths[0] }))}` })
    } catch { Taro.showToast({ title: '请选择照片', icon: 'none' }) }
  }
  return (<View className='divination-form'><View className='form-card'><Text className='form-title'>面相分析</Text><Text className='form-desc'>上传正面照片，AI 分析面相</Text></View><Button className='submit-btn' onClick={handleChooseImage}>选择照片</Button></View>)
}
