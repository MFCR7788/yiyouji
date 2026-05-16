import type { UserConfig } from '@tarojs/cli'

export default {
  logger: {
    quiet: false,
    stats: true,
  },
  mini: {
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
  },
  h5: {},
} satisfies UserConfig
