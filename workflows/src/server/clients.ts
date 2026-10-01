import {createClient, type SanityClient} from '@sanity/client'
import {ENGINE_API_VERSION} from '@sanity/workflow-engine'

import {CONTENT_DATASET, PROJECT_ID, WORKFLOW_DATASET} from '../config'

let cached: {content: SanityClient; workflow: SanityClient} | undefined

/** Server-side clients. One editor token reads/writes both datasets. */
export function clients() {
  if (cached) return cached
  const token = process.env.SANITY_WRITE_TOKEN
  if (!token) throw new Error('Missing SANITY_WRITE_TOKEN')
  const content = createClient({projectId: PROJECT_ID, dataset: CONTENT_DATASET, apiVersion: '2026-04-29', token, useCdn: false})
  const workflow = content.withConfig({dataset: WORKFLOW_DATASET, apiVersion: ENGINE_API_VERSION})
  cached = {content, workflow}
  return cached
}
