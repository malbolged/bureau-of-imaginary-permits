import {createClient} from '@sanity/client'

import {bulletins, cases} from './cases'
import {departments, forms, permitTypes} from './data'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) throw new Error('Missing SANITY_WRITE_TOKEN (see ../.env.example)')

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || 'e23lrcxv',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2026-04-29',
  token,
  useCdn: false,
})

const docs: {_id: string; _type: string}[] = [...departments, ...forms, ...permitTypes, ...bulletins, ...cases]
const tx = client.transaction()
for (const doc of docs) tx.createOrReplace(doc)
await tx.commit()

console.log(`Seeded ${departments.length} departments, ${forms.length} forms, ${permitTypes.length} permit types, ${bulletins.length} bulletins, ${cases.length} cases`)
