import {fileApplication, fileStatus, settle} from '../src/server'

const [permitSlug = 'whistle-on-tuesdays', ...rest] = process.argv.slice(2)
const answers = Object.fromEntries(rest.map((kv) => kv.split('=') as [string, string]))

const t0 = Date.now()
const {reference, instanceId} = await fileApplication({permitSlug, applicantName: 'Agnes Thrupp', answers})
console.log('filed', reference, instanceId, `${Date.now() - t0}ms`)
const inst = await settle(instanceId)
console.log('stage after settle:', inst.currentStage, `${Date.now() - t0}ms`)
const s = await fileStatus(reference)
for (const m of s.application.memos) console.log(`  [${m.from}/${m.verdict}] ${m.text}${m.form ? ` (form ${m.form.code})` : ''}`)
console.log('history:', s.instance.history.map((h: any) => h.type ?? h.kind).join(' > '))
