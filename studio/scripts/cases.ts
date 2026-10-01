/**
 * The inspector game: daily bulletins and scripted applicants. Each case stores its truth; the
 * server scores the inspector's stamp against it. Clerk memos are authored, and the clerk always
 * passed these files: the game is about what the AI missed.
 */

const ref = (_ref: string) => ({_type: 'reference', _ref})
let k = 0
const key = () => `c${(k++).toString(36)}`
const lines = (pairs: [string, string][]) => pairs.map(([label, value]) => ({_key: key(), _type: 'line', label, value}))

export const bulletins = [
  {
    _id: 'bulletin-day-1',
    _type: 'bulletin',
    day: 1,
    title: 'Welcome to the window, Inspector',
    date: '2026-10-14',
    rules: [
      'Every applicant must present a Citizen Card.',
      'The name on the Citizen Card must match the application exactly.',
      'Citizen Cards must not be expired.',
      'Every answer must satisfy the rule printed in the Rulebook for that permit.',
      'If the permit requires another licence, it must be presented, held in the same name, and valid.',
      'The clerk has already passed every file. The clerk is tired. Trust nothing.',
    ],
  },
  {
    _id: 'bulletin-day-2',
    _type: 'bulletin',
    day: 2,
    title: 'Amendments, effective immediately',
    date: '2026-10-15',
    rules: [
      'All of yesterday’s rules still apply.',
      'NEW: Indoor dragons may not exceed 30 cm at rest, until further notice. This overrides the Rulebook.',
      'NEW: Hauntings require a ghost in residence for at least 50 years.',
      'NEW: Compare the photo on the Citizen Card with the applicant at the window.',
      'Licences presented must be held in the applicant’s exact name.',
    ],
  },
]

function citizenCard(name: string, portrait: string, number: string, district: string, expires: string) {
  return {
    _key: key(),
    _type: 'paper',
    kind: 'citizen-card',
    title: 'Citizen Card',
    portrait,
    lines: lines([
      ['Name', name],
      ['Card no.', number],
      ['District', district],
      ['Expires', expires],
    ]),
  }
}

function licence(title: string, holder: string, number: string, valid: string) {
  return {
    _key: key(),
    _type: 'paper',
    kind: 'licence',
    title,
    lines: lines([
      ['Holder', holder],
      ['Permit no.', number],
      ['Valid until', valid],
    ]),
  }
}

interface CaseInput {
  id: string
  order: number
  permit: string
  name: string
  portrait: string
  greeting: string
  answers: Record<string, string>
  papers: (ReturnType<typeof citizenCard> | ReturnType<typeof licence>)[]
  clerkMemo: string
  truth: 'approve' | 'deny'
  reason: string
  onApproved: string
  onDenied: string
}

const c = (day: number, x: CaseInput) => ({
  _id: `case-d${day}-${x.id}`,
  _type: 'case',
  day,
  order: x.order,
  permitType: ref(x.permit),
  applicantName: x.name,
  portrait: x.portrait,
  greeting: x.greeting,
  answers: Object.entries(x.answers).map(([k_, answer]) => ({_key: k_, _type: 'answer', key: k_, answer})),
  papers: x.papers,
  clerkMemo: x.clerkMemo,
  truth: x.truth,
  reason: x.reason,
  onApproved: x.onApproved,
  onDenied: x.onDenied,
})

export const cases = [
  c(1, {
    id: 'whistler',
    order: 1,
    permit: 'permit-whistle-on-tuesdays',
    name: 'Wendell Pike',
    portrait: 'wendell-pike',
    greeting: 'Morning. I would like to whistle. On Tuesdays. Legally.',
    answers: {tune: 'The Skye Boat Song', where: 'On the pier at Howth, facing the sea'},
    papers: [citizenCard('Wendell Pike', 'wendell-pike', 'CC-40217', 'Howth', '03.02.2029')],
    clerkMemo: 'A named tune, a pier, no libraries and no heists in sight. In order.',
    truth: 'approve',
    reason: 'Everything was in order.',
    onApproved: 'Tuesdays will never be quiet again. Thank you.',
    onDenied: 'But… it is such a short tune.',
  }),
  c(1, {
    id: 'pigeon-namer',
    order: 2,
    permit: 'permit-name-a-pigeon',
    name: 'Margery Fitch',
    portrait: 'margery-fitch',
    greeting: 'He has a white sock on one foot. I call him Sir Reginald. Unofficially, for now.',
    answers: {pigeon: 'Grey, with one white sock on the left foot and a limp swagger. Lives by the Ha’penny Bridge.', name: 'Sir Reginald Featherstonehaugh'},
    papers: [citizenCard('Margery Finch', 'margery-fitch', 'CC-11873', 'Temple Bar', '19.06.2027')],
    clerkMemo: 'Distinguishing feature present (one white sock). Name dignified. In order.',
    truth: 'deny',
    reason: 'The Citizen Card says Margery FINCH; the application says Margery FITCH.',
    onApproved: 'Sir Reginald thanks you. So does Margery. One of them.',
    onDenied: 'Fitch, Finch, what is one letter between friends?',
  }),
  c(1, {
    id: 'dragon-keeper',
    order: 3,
    permit: 'permit-indoor-dragon',
    name: 'Osric Delaney',
    portrait: 'osric-delaney',
    greeting: 'She is small. Ish. She is very small for a dragon.',
    answers: {dragonName: 'Cinders', size: '41', fireplan: 'A licensed puddle beside the hearth and a bucket on the landing.'},
    papers: [
      citizenCard('Osric Delaney', 'osric-delaney', 'CC-27755', 'Rathmines', '11.11.2028'),
      licence('Licence to Keep a Puddle', 'Osric Delaney', 'IP-7QX2KD', '01.03.2027'),
    ],
    clerkMemo: 'Named dragon, licensed puddle on file, fire plan mentions water. In order.',
    truth: 'deny',
    reason: 'Cinders is 41 cm at rest. The limit for an indoor dragon is 35 cm.',
    onApproved: 'Cinders will be so pleased. Please do not mention this to my landlord.',
    onDenied: 'She will be devastated. She will also set something on fire.',
  }),
  c(1, {
    id: 'afternoon',
    order: 4,
    permit: 'permit-misplace-an-afternoon',
    name: 'Prudence Okafor',
    portrait: 'prudence-okafor',
    greeting: 'I would like to lose a Thursday afternoon. On purpose, this time.',
    answers: {which: '20 November 2026', why: 'Nothing whatsoever. I intend to stare at a radiator.'},
    papers: [citizenCard('Prudence Okafor', 'prudence-okafor', 'CC-09114', 'Phibsborough', '02.09.2026')],
    clerkMemo: 'A future date, and a commendably empty plan. In order.',
    truth: 'deny',
    reason: 'The Citizen Card expired on 02.09.2026. Today is 14.10.2026.',
    onApproved: 'Splendid. I shall not see you on the twentieth.',
    onDenied: 'Expired? I have been meaning to renew it. For about an afternoon.',
  }),
  c(1, {
    id: 'haunting',
    order: 5,
    permit: 'permit-residential-haunting',
    name: 'Bartholomew Quince',
    portrait: 'bartholomew-quince',
    greeting: 'Mrs Pell has been with us since 1791. She would like it to be official.',
    answers: {ghost: 'Mrs Pell, a Georgian lady who rearranges the spoons. In residence since 1791.', hours: '23:00 to 01:00, Sunday to Thursday', consent: 'Yes'},
    papers: [citizenCard('Bartholomew Quince', 'bartholomew-quince', 'CC-55302', 'Stoneybatter', '28.04.2030')],
    clerkMemo: 'Residence since 1791, specific hours, consent given. Mrs Pell sounds delightful. In order.',
    truth: 'deny',
    reason: 'Haunting from 23:00 Sunday to Thursday overlaps school nights past 22:00.',
    onApproved: 'Mrs Pell sends her regards. And a cold draught.',
    onDenied: 'I shall have to tell her. She will rattle.',
  }),
  c(1, {
    id: 'cloud',
    order: 6,
    permit: 'permit-medium-cloud',
    name: 'Agnes Thrupp',
    portrait: 'agnes-thrupp',
    greeting: 'It is shaped like a sofa. I have already named it. Is that allowed?',
    answers: {cloud: 'A plump cumulus shaped like a sofa, last seen over Phibsborough at noon.', use: 'Shade for my tomatoes, and contemplation.'},
    papers: [
      citizenCard('Agnes Thrupp', 'agnes-thrupp', 'CC-31640', 'Phibsborough', '17.08.2028'),
      licence('Licence to Look Up', 'Agnes Thrupp', 'IP-D6GK4N', 'Indefinite'),
    ],
    clerkMemo: 'Cumulus, located, peaceful use. Licence to Look Up presented. In order.',
    truth: 'approve',
    reason: 'Everything was in order.',
    onApproved: 'The tomatoes and I thank you.',
    onDenied: 'Then who will shade the tomatoes?',
  }),
  c(1, {
    id: 'birthday',
    order: 7,
    permit: 'permit-late-to-own-birthday',
    name: 'Fenwick Adeyemi',
    portrait: 'fenwick-adeyemi',
    greeting: 'It is a velvet cape. It takes time to put on correctly.',
    answers: {age: '40', minutes: '90', outfit: 'A floor-length velvet cape with forty-one buttons, each done up by hand.'},
    papers: [citizenCard('Fenwick Adeyemi', 'fenwick-adeyemi', 'CC-62018', 'Ranelagh', '30.12.2027')],
    clerkMemo: 'Ninety minutes is within the cap for forty years. The cape is persuasive. In order.',
    truth: 'approve',
    reason: 'Everything was in order (the cap at 40 is 240 minutes).',
    onApproved: 'I shall arrive exactly ninety minutes late. Magnificently.',
    onDenied: 'Then I shall have to be on time. In this cape.',
  }),

  // Day 2: the rules change.
  c(2, {
    id: 'small-dragon',
    order: 1,
    permit: 'permit-indoor-dragon',
    name: 'Hildegard Moss',
    portrait: 'hildegard-moss',
    greeting: 'Thirty-two centimetres. I measured twice. She bit the tape once.',
    answers: {dragonName: 'Pip', size: '32', fireplan: 'Our licensed puddle is right by her basket, and a watering can besides.'},
    papers: [
      citizenCard('Hildegard Moss', 'hildegard-moss', 'CC-70412', 'Drumcondra', '09.09.2029'),
      licence('Licence to Keep a Puddle', 'Hildegard Moss', 'IP-PDL8Q4', '30.06.2027'),
    ],
    clerkMemo: 'Thirty-two is under the thirty-five centimetre limit. Puddle licence on file. In order.',
    truth: 'deny',
    reason: 'Pip is 32 cm. Today’s bulletin lowered the limit to 30 cm. The clerk read the old Rulebook.',
    onApproved: 'Pip thanks you. Quietly. For now.',
    onDenied: 'Two centimetres! She is mostly tail!',
  }),
  c(2, {
    id: 'young-ghost',
    order: 2,
    permit: 'permit-residential-haunting',
    name: 'Desmond Achterberg',
    portrait: 'desmond-achterberg',
    greeting: 'He is a very new ghost. But keen.',
    answers: {ghost: 'Kevin, who used to own the flat. In residence since 2001, mostly in the hot press.', hours: '20:00 to 21:30, weekends only', consent: 'Yes'},
    papers: [citizenCard('Desmond Achterberg', 'desmond-achterberg', 'CC-38820', 'Clontarf', '14.02.2028')],
    clerkMemo: 'Residence stated, hours specific and well before 22:00, consent given. In order.',
    truth: 'deny',
    reason: 'Kevin has haunted since 2001: 25 years. Today’s bulletin requires at least 50.',
    onApproved: 'Kevin will be thrilled. He has been practising.',
    onDenied: 'I will tell him to come back in 2051.',
  }),
  c(2, {
    id: 'puddle',
    order: 3,
    permit: 'permit-keep-a-puddle',
    name: 'Rosalind Okonkwo',
    portrait: 'rosalind-okonkwo',
    greeting: 'It is outside the back door. It has always been there. I would like it recognised.',
    answers: {location: 'The dip in the flagstones outside my back door, Harold’s Cross', depth: '9'},
    papers: [citizenCard('Rosalind Okonkwo', 'rosalind-okonkwo', 'CC-51177', 'Harold’s Cross', '21.05.2030')],
    clerkMemo: 'Fixed outdoor location, nine centimetres. In order.',
    truth: 'approve',
    reason: 'Everything was in order.',
    onApproved: 'At last. It has been waiting thirty years.',
    onDenied: 'It will still be there tomorrow. So will I.',
  }),
  c(2, {
    id: 'impostor',
    order: 4,
    permit: 'permit-look-up',
    name: 'Cornelius Vane',
    portrait: 'cornelius-vane',
    greeting: 'Just a Licence to Look Up, please. Nothing suspicious. I look up all the time.',
    answers: {reason: 'To see what is up there.'},
    papers: [citizenCard('Cornelius Vane', 'definitely-someone-else', 'CC-90031', 'Dalkey', '11.01.2031')],
    clerkMemo: 'Sincere reason, the accepted wording in fact. In order.',
    truth: 'deny',
    reason: 'The photo on the Citizen Card is not the person at the window.',
    onApproved: 'Splendid. I mean: thank you, as myself.',
    onDenied: 'This is my face. I have simply been looking up a lot.',
  }),
  c(2, {
    id: 'star',
    order: 5,
    permit: 'permit-rename-a-minor-star',
    name: 'Imelda Ferrante',
    portrait: 'imelda-ferrante',
    greeting: 'It is the bright orange one in Orion’s shoulder. I think it deserves a nicer name.',
    answers: {star: 'Betelgeuse, the orange one on Orion’s shoulder', newName: 'Philomena'},
    papers: [
      citizenCard('Imelda Ferrante', 'imelda-ferrante', 'CC-24468', 'Sandymount', '03.03.2029'),
      licence('Licence to Look Up', 'Imelda Ferrante', 'IP-LKUP27', 'Indefinite'),
    ],
    clerkMemo: 'Look Up licence presented. Philomena is pronounceable by the Minister. In order.',
    truth: 'deny',
    reason: 'Betelgeuse is a famous star. Only minor stars may be renamed.',
    onApproved: 'Philomena it is! Do tell Orion.',
    onDenied: 'But it is so orange.',
  }),
  c(2, {
    id: 'cloud-mole',
    order: 6,
    permit: 'permit-medium-cloud',
    name: 'Ignatius Moll',
    portrait: 'ignatius-moll',
    greeting: 'I would like the cloud over the Phoenix Park. The fluffy one. Not the grey one.',
    answers: {cloud: 'A tall cumulus over the Phoenix Park, fluffy, usually there after lunch.', use: 'Naming things after it.'},
    papers: [
      citizenCard('Ignatius Moll', 'ignatius-moll', 'CC-66105', 'Cabra', '27.07.2028'),
      licence('Licence to Look Up', 'Ignatius Mole', 'IP-MLE993', 'Indefinite'),
    ],
    clerkMemo: 'Cumulus, located, accepted use. Licence to Look Up attached. In order.',
    truth: 'deny',
    reason: 'The Licence to Look Up is held by Ignatius MOLE, not Ignatius MOLL.',
    onApproved: 'I shall name a sandwich after it.',
    onDenied: 'Mole, Moll. The cloud does not mind.',
  }),
  c(2, {
    id: 'pigeon-two',
    order: 7,
    permit: 'permit-name-a-pigeon',
    name: 'Tobias Greenhalgh',
    portrait: 'tobias-greenhalgh',
    greeting: 'She has a crooked beak and a very serious expression.',
    answers: {pigeon: 'Grey with a crooked beak and a single green neck feather. Sits on the Molly Malone statue.', name: 'Professor Ottoline'},
    papers: [citizenCard('Tobias Greenhalgh', 'tobias-greenhalgh', 'CC-47290', 'Smithfield', '12.12.2028')],
    clerkMemo: 'Distinguishing features plentiful. Name dignified, possibly over-qualified. In order.',
    truth: 'approve',
    reason: 'Everything was in order.',
    onApproved: 'The Professor will see you now. Well, she will see you.',
    onDenied: 'She has a doctorate, you know.',
  }),
]
