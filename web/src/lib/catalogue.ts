import 'server-only'

import {createClient} from '@sanity/client'

/** Public, token-less reads of the catalogue: anyone can query the same thing. */
const publicClient = createClient({projectId: 'e23lrcxv', dataset: 'production', apiVersion: '2026-04-29', useCdn: false})

export type Chain = 'express-permit' | 'standard-permit' | 'sky-permit'

export const CHAINS: Record<Chain, {label: string; steps: string[]}> = {
  'express-permit': {label: 'Express', steps: ['AI clerk']},
  'standard-permit': {label: 'Standard', steps: ['AI clerk', 'Under-Secretary']},
  'sky-permit': {label: 'Sky', steps: ['AI clerk', 'Ministry of Weather', 'Under-Secretary', 'Minister']},
}

export interface PermitSummary {
  _id: string
  title: string
  slug: string
  summary?: string
  fee?: number
  validity?: string
  workflow: Chain
  prerequisites: {title: string; slug: string}[]
}

export interface Department {
  _id: string
  name: string
  motto?: string
  floor?: string
  head?: string
  permits: PermitSummary[]
}

const PERMIT_FIELDS = `_id, title, "slug": slug.current, summary, fee, validity, workflow, "prerequisites": coalesce(prerequisites[]->{title, "slug": slug.current}, [])`

export function getDepartments() {
  return publicClient.fetch<Department[]>(
    `*[_type == "department"] | order(name asc){
      _id, name, motto, floor, head,
      "permits": *[_type == "permitType" && references(^._id)] | order(fee asc){${PERMIT_FIELDS}}
    }`,
  )
}

export interface PermitDetail extends PermitSummary {
  clerkInstructions?: string
  department: {name: string; floor?: string; head?: string}
  requirements: {key: string; question: string; kind: 'text' | 'long-text' | 'number' | 'yes-no'; clerkCheck?: string}[]
  forms: {code: string; title: string}[]
}

export function getPermit(slug: string) {
  return publicClient.fetch<PermitDetail | null>(
    `*[_type == "permitType" && slug.current == $slug][0]{
      ${PERMIT_FIELDS}, clerkInstructions,
      "department": department->{name, floor, head},
      requirements[]{key, question, kind, clerkCheck},
      "forms": forms[]->{code, title}
    }`,
    {slug},
  )
}
