import {clients} from '../src/server'
const {content} = clients()
const ids = await content.fetch<string[]>(`*[_type == "shift" && (player == "Smoke Tester" || player match "Test Inspector*")]._id`)
const tx = content.transaction()
ids.forEach((id) => tx.delete(id))
await tx.commit()
console.log('deleted', ids.length, 'test shifts')
