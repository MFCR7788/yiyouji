import { View } from '@tarojs/components'
import './skeleton.scss'

interface SkeletonProps {
  rows?: number
  avatar?: boolean
}

export default function Skeleton({ rows = 3, avatar = false }: SkeletonProps) {
  return (
    <View className='skeleton-container'>
      {avatar && <View className='skeleton-avatar' />}
      <View className='skeleton-content'>
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            className={`skeleton-row ${i === rows - 1 ? 'skeleton-row--short' : ''}`}
          />
        ))}
      </View>
    </View>
  )
}
