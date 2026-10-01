import {config} from 'dotenv'
import type {NextConfig} from 'next'

// One .env at the repo root is shared by the Studio, the workflow scripts and this app.
config({path: '../.env', quiet: true})

const nextConfig: NextConfig = {
  // The workflow package ships TypeScript source.
  transpilePackages: ['@bureau/workflows'],
}

export default nextConfig
