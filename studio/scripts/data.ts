/** Seed content for the Bureau. Deterministic IDs so re-seeding updates in place. */

const ref = (_ref: string) => ({_type: 'reference', _ref})
const slug = (current: string) => ({_type: 'slug', current})
let k = 0
const key = () => `k${(k++).toString(36)}`

export const departments = [
  {
    _id: 'dept-minor-whimsy',
    _type: 'department',
    name: 'Department of Minor Whimsy',
    slug: slug('minor-whimsy'),
    motto: 'Small joys, properly licensed.',
    floor: 'Floor 3½',
    head: 'Deputy Assistant Commissioner Ottoline Brask',
  },
  {
    _id: 'dept-atmospheric',
    _type: 'department',
    name: 'Office of Atmospheric Allocation',
    slug: slug('atmospheric-allocation'),
    motto: 'Every cloud has an owner.',
    floor: 'The roof (bring a coat)',
    head: 'Minister Aurelio Fenn-Haddow',
  },
  {
    _id: 'dept-temporal',
    _type: 'department',
    name: 'Directorate of Temporal Irregularities',
    slug: slug('temporal-irregularities'),
    motto: 'We were expecting you.',
    floor: 'Floor 0 (formerly 7)',
    head: 'Registrar Imelda Quist',
  },
  {
    _id: 'dept-domestic',
    _type: 'department',
    name: 'Bureau of Domestic Phenomena',
    slug: slug('domestic-phenomena'),
    motto: 'What lives in your house is our business.',
    floor: 'Basement B2, past the boiler',
    head: 'Under-Secretary Hollis Pym',
  },
]

export const forms = [
  {code: '27-B/6', id: 'form-27b6', title: 'Declaration of Sincere Intent', purpose: 'Filed when the clerk suspects the applicant is only half serious.', question: 'In no fewer than ten words, explain why you truly mean it.'},
  {code: '9-Ω', id: 'form-9-omega', title: 'Witness Statement from a Bird', purpose: 'Character reference from any bird of good standing.', question: 'Name a bird who will vouch for you, and quote what it said.'},
  {code: '44-Q', id: 'form-44q', title: 'Inventory of Previous Whims', purpose: 'Establishes a track record of responsible whimsy.', question: 'List the last three whims you acted upon, and how each turned out.'},
  {code: '12-Z', id: 'form-12z', title: 'Certificate of Not Being in a Hurry', purpose: 'Required for anything involving time.', question: 'Describe, at leisure, how much time you have.'},
  {code: '3-Δ', id: 'form-3-delta', title: 'Cloud Maintenance Undertaking', purpose: 'Owners must keep clouds fluffed and out of other people’s weather.', question: 'Who will fluff the cloud during dry spells, and how often?'},
  {code: '88-H', id: 'form-88h', title: 'Haunting Liability Waiver', purpose: 'The ghost must consent. So must you.', question: 'Name the ghost and confirm it consents to the arrangement.'},
  {code: '61-T', id: 'form-61t', title: 'Temporal Consistency Affidavit', purpose: 'Ensures your past, present and future selves agree.', question: 'State today’s date as it appears to you, and as your future self remembers it.'},
  {code: '0-0', id: 'form-0-0', title: 'Form Requesting a Form', purpose: 'For when no other form will do.', question: 'Which form would you have preferred we asked for, and why?'},
].map(({id, ...f}) => ({_id: id, _type: 'form', ...f}))

type Req = [key: string, question: string, kind: 'text' | 'long-text' | 'number' | 'yes-no', clerkCheck: string]

function permit(p: {
  id: string
  title: string
  dept: string
  workflow: 'standard-permit' | 'express-permit' | 'sky-permit'
  summary: string
  fee: number
  validity: string
  requirements: Req[]
  forms: string[]
  prerequisites?: string[]
  clerkInstructions?: string
}) {
  return {
    _id: p.id,
    _type: 'permitType',
    title: p.title,
    slug: slug(p.id.replace(/^permit-/, '')),
    department: ref(p.dept),
    workflow: p.workflow,
    summary: p.summary,
    fee: p.fee,
    validity: p.validity,
    requirements: p.requirements.map(([key_, question, kind, clerkCheck]) => ({
      _key: key(),
      _type: 'requirement',
      key: key_,
      question,
      kind,
      clerkCheck,
    })),
    forms: p.forms.map((f) => ({...ref(f), _key: key()})),
    prerequisites: (p.prerequisites ?? []).map((f) => ({...ref(f), _key: key()})),
    clerkInstructions: p.clerkInstructions,
  }
}

export const permitTypes = [
  permit({
    id: 'permit-whistle-on-tuesdays',
    title: 'Licence to Whistle on Tuesdays',
    dept: 'dept-minor-whimsy',
    workflow: 'express-permit',
    summary: 'Whistling on the other six days remains unregulated.',
    fee: 2,
    validity: 'Fifty-two Tuesdays',
    requirements: [
      ['tune', 'Which tune will you whistle?', 'text', 'Must be a named tune. "Just some notes" or humming is not a tune.'],
      ['where', 'Where will the whistling occur?', 'text', 'Any place is fine except libraries and the scene of a heist.'],
    ],
    forms: ['form-27b6', 'form-9-omega'],
  }),
  permit({
    id: 'permit-name-a-pigeon',
    title: 'Permit to Name a Pigeon',
    dept: 'dept-minor-whimsy',
    workflow: 'express-permit',
    summary: 'For one specific pigeon. The pigeon will not be informed.',
    fee: 1,
    validity: 'For the life of the pigeon, or until it moves away',
    requirements: [
      ['pigeon', 'Describe the pigeon so it can be told apart from other pigeons.', 'long-text', 'Needs at least one distinguishing feature beyond "grey".'],
      ['name', 'Proposed name', 'text', 'Must be dignified. Names that are puns on "coo" are refused.'],
    ],
    forms: ['form-9-omega', 'form-44q'],
  }),
  permit({
    id: 'permit-keep-a-puddle',
    title: 'Licence to Keep a Puddle',
    dept: 'dept-domestic',
    workflow: 'express-permit',
    summary: 'One puddle, kept in a fixed location, not to exceed ankle depth.',
    fee: 3,
    validity: 'Until it evaporates',
    requirements: [
      ['location', 'Where is the puddle?', 'text', 'Must be a fixed outdoor location. Puddles in shoes are not eligible.'],
      ['depth', 'Depth at its deepest (cm)', 'number', 'Ankle depth or less (12 cm).'],
    ],
    forms: ['form-44q', 'form-0-0'],
  }),
  permit({
    id: 'permit-look-up',
    title: 'Licence to Look Up',
    dept: 'dept-atmospheric',
    workflow: 'express-permit',
    summary: 'Required before applying for anything in the sky.',
    fee: 0,
    validity: 'Indefinite, subject to neck condition',
    requirements: [
      ['reason', 'Why do you wish to look up?', 'text', 'Any sincere reason. "To see what is up there" is accepted.'],
    ],
    forms: ['form-27b6'],
  }),
  permit({
    id: 'permit-indoor-dragon',
    title: 'Permit to Keep a Small Dragon (Indoor)',
    dept: 'dept-domestic',
    workflow: 'standard-permit',
    summary: 'Small means shoebox-sized at rest. Fire-safety rules apply.',
    fee: 40,
    validity: 'One year, or one incident',
    requirements: [
      ['dragonName', 'The dragon’s name', 'text', 'Required. Dragons without names are considered wild.'],
      ['size', 'Length at rest, nose to tail (cm)', 'number', 'Must be 35 cm or less.'],
      ['fireplan', 'Describe your fire-safety arrangements.', 'long-text', 'Must mention water within reach. A licensed puddle counts.'],
    ],
    forms: ['form-27b6', 'form-44q', 'form-0-0'],
    prerequisites: ['permit-keep-a-puddle'],
    clerkInstructions: 'The applicant must already hold a Licence to Keep a Puddle (for fire safety). That check is done for you; you will be told the result.',
  }),
  permit({
    id: 'permit-residential-haunting',
    title: 'Licence to Be Haunted (Residential)',
    dept: 'dept-domestic',
    workflow: 'standard-permit',
    summary: 'For households hosting one ghost of a quiet disposition.',
    fee: 13,
    validity: 'Eternal, revocable by exorcism',
    requirements: [
      ['ghost', 'Describe the ghost.', 'long-text', 'Must include how long it has been in residence.'],
      ['hours', 'Agreed haunting hours', 'text', 'Must be specific hours, and must not overlap school nights past 22:00.'],
      ['consent', 'Does the ghost consent?', 'yes-no', 'Must be yes. If unsure, request the Haunting Liability Waiver.'],
    ],
    forms: ['form-88h', 'form-9-omega'],
  }),
  permit({
    id: 'permit-misplace-an-afternoon',
    title: 'Permit to Misplace One (1) Afternoon',
    dept: 'dept-temporal',
    workflow: 'standard-permit',
    summary: 'The afternoon will be returned to general circulation afterwards.',
    fee: 9,
    validity: 'One afternoon, single use',
    requirements: [
      ['which', 'Which afternoon? (date)', 'text', 'Must be a specific future date. Past afternoons are already spoken for.'],
      ['why', 'What will you do instead?', 'long-text', 'Nothing is an acceptable answer. Something productive is suspicious.'],
    ],
    forms: ['form-12z', 'form-61t'],
  }),
  permit({
    id: 'permit-late-to-own-birthday',
    title: 'Permit to Arrive Fashionably Late to Your Own Birthday',
    dept: 'dept-temporal',
    workflow: 'standard-permit',
    summary: 'Lateness capped at one hour per decade of age.',
    fee: 5,
    validity: 'One birthday',
    requirements: [
      ['age', 'Age you are turning', 'number', 'Any age. Used to compute the lateness cap.'],
      ['minutes', 'Intended lateness (minutes)', 'number', 'Must not exceed six minutes per year of age.'],
      ['outfit', 'Describe the outfit that justifies the lateness.', 'long-text', 'Must plausibly justify the delay.'],
    ],
    forms: ['form-12z', 'form-27b6'],
  }),
  permit({
    id: 'permit-medium-cloud',
    title: 'Deed to a Medium-Sized Cloud',
    dept: 'dept-atmospheric',
    workflow: 'sky-permit',
    summary: 'Cumulus only. Owners are responsible for any rain it causes.',
    fee: 120,
    validity: 'Until it dissipates or wanders into another jurisdiction',
    requirements: [
      ['cloud', 'Describe the cloud and where you last saw it.', 'long-text', 'Must be a cumulus, and must include a location.'],
      ['use', 'What will you use it for?', 'text', 'Shade, contemplation and naming things after it are accepted uses. Weaponised rain is not.'],
    ],
    forms: ['form-3-delta', 'form-27b6'],
    prerequisites: ['permit-look-up'],
    clerkInstructions: 'The applicant must already hold a Licence to Look Up. That check is done for you; you will be told the result.',
  }),
  permit({
    id: 'permit-rename-a-minor-star',
    title: 'Permit to Rename a Minor Star',
    dept: 'dept-atmospheric',
    workflow: 'sky-permit',
    summary: 'Minor means not visible from a city. Major stars are not available.',
    fee: 60,
    validity: 'Until someone with a bigger telescope objects',
    requirements: [
      ['star', 'Which star? (approximate position is fine)', 'text', 'Must be a minor star. Famous stars like Sirius or the Sun are refused.'],
      ['newName', 'Proposed name', 'text', 'Must be pronounceable by the Minister.'],
    ],
    forms: ['form-27b6', 'form-0-0'],
    prerequisites: ['permit-look-up'],
    clerkInstructions: 'The applicant must already hold a Licence to Look Up. That check is done for you; you will be told the result.',
  }),
]
