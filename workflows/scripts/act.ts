import {resubmit, settle, visitorStamp} from '../src/server'
const [ref, verb, ...text] = process.argv.slice(2)
const t0 = Date.now()
const id = verb === "reply" ? await resubmit(ref, text.join(" ")) : await visitorStamp(ref, verb as "approve" | "deny", text.join(" "))
const inst = await settle(id)
console.log(verb, '→', inst.currentStage, `${Date.now() - t0}ms`)
