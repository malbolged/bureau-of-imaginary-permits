import {deployedDefinitions, deskQueue, fileView, bureauStats} from '../src/server'
const v = await fileView(process.argv[2] ?? 'IP-U9E8G8')
console.log(JSON.stringify({...v, answers: undefined, memos: v.memos.length}, null, 1).slice(0, 3000))
console.log(await deskQueue(), await bureauStats(), (await deployedDefinitions()).map((d) => `${d.name} v${d.version} ${d.stages.length} stages`))
