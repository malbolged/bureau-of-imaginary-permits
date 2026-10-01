import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_PROJECT_ID || 'e23lrcxv',
    dataset: process.env.SANITY_DATASET || 'production',
  },
  studioHost: 'imaginary-permits',
  deployment: {appId: 'ap9him8o74hgnehubr3rsi3u', autoUpdates: true},
})
