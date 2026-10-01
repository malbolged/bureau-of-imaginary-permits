import {clients, fileStatus} from '../src/server'
const ref = process.argv[2] ?? (await clients().content.fetch<string>(`*[_type=="application"]|order(submittedAt desc)[0].reference`))
const s = await fileStatus(ref)
console.log(ref, s.application.permit.title, '→', s.instance.currentStage)
for (const m of s.application.memos) console.log(`  [${m.from}/${m.verdict}] ${m.text}${m.form ? ` (form ${m.form.code})` : ''}`)
console.log(s.instance.history.filter((h: any) => ['transitionFired', 'actionFired'].includes(h._type)).map((h: any) => h._type === 'transitionFired' ? `${h.fromStage}→${h.toStage}` : `${h.action}`).join(' | '))
