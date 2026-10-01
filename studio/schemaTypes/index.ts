import {definitions} from '@bureau/workflows/definitions'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const department = defineType({
  name: 'department',
  title: 'Department',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'name'}, validation: (r) => r.required()}),
    defineField({name: 'motto', type: 'string'}),
    defineField({name: 'floor', type: 'string', description: 'Where to queue. Floors may be fractional.'}),
    defineField({name: 'head', title: 'Head of department', type: 'string'}),
  ],
  preview: {select: {title: 'name', subtitle: 'floor'}},
})

export const form = defineType({
  name: 'form',
  title: 'Form',
  type: 'document',
  description: 'Supplementary paperwork. The AI clerk may only request forms that exist here.',
  fields: [
    defineField({name: 'code', type: 'string', description: 'e.g. 27-B/6', validation: (r) => r.required()}),
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'purpose', type: 'text', rows: 2}),
    defineField({
      name: 'question',
      title: 'Question the citizen must answer',
      type: 'string',
      validation: (r) => r.required(),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'code'}},
})

export const permitType = defineType({
  name: 'permitType',
  title: 'Permit type',
  type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}, validation: (r) => r.required()}),
    defineField({name: 'department', type: 'reference', to: [{type: 'department'}], validation: (r) => r.required()}),
    defineField({
      name: 'workflow',
      title: 'Approval chain',
      type: 'string',
      description: 'Which deployed workflow definition governs this permit.',
      options: {list: definitions.map((d) => ({title: d.title ?? d.name, value: d.name})), layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'summary', type: 'text', rows: 2}),
    defineField({name: 'fee', type: 'number', description: 'In imaginary crowns.'}),
    defineField({name: 'validity', type: 'string', description: 'e.g. "Until the next eclipse"'}),
    defineField({
      name: 'requirements',
      title: 'Application questions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'requirement',
          fields: [
            defineField({name: 'key', type: 'string', validation: (r) => r.required().regex(/^[a-z][a-zA-Z0-9]*$/)}),
            defineField({name: 'question', type: 'string', validation: (r) => r.required()}),
            defineField({
              name: 'kind',
              type: 'string',
              options: {list: ['text', 'long-text', 'number', 'yes-no']},
              initialValue: 'text',
            }),
            defineField({
              name: 'clerkCheck',
              title: 'What the clerk checks',
              type: 'string',
              description: 'Plain-language rule the AI clerk applies to the answer.',
            }),
          ],
          preview: {select: {title: 'question', subtitle: 'clerkCheck'}},
        }),
      ],
      validation: (r) => r.min(1).max(5),
    }),
    defineField({
      name: 'prerequisites',
      title: 'Permits the applicant must already hold',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'permitType'}]})],
      validation: (r) =>
        r.custom((refs: {_ref: string}[] | undefined, ctx) => {
          const self = ctx.document?._id.replace(/^drafts\./, '')
          return refs?.some((r) => r._ref === self) ? 'A permit cannot require itself' : true
        }),
    }),
    defineField({
      name: 'forms',
      title: 'Forms the clerk may request',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'form'}]})],
      validation: (r) => r.min(1),
    }),
    defineField({
      name: 'clerkInstructions',
      title: 'Standing instructions to the clerk',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'workflow'}},
})

export const application = defineType({
  name: 'application',
  title: 'Application',
  type: 'document',
  description: 'Filed by a citizen on the public site. Its progress lives in a workflow instance, not here.',
  fields: [
    defineField({name: 'reference', type: 'string', readOnly: true}),
    defineField({name: 'permitType', type: 'reference', to: [{type: 'permitType'}], validation: (r) => r.required()}),
    defineField({name: 'applicantName', type: 'string', validation: (r) => r.required()}),
    defineField({
      name: 'answers',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'answer',
          fields: [
            defineField({name: 'key', type: 'string'}),
            defineField({name: 'question', type: 'string'}),
            defineField({name: 'answer', type: 'text', rows: 2}),
          ],
          preview: {select: {title: 'question', subtitle: 'answer'}},
        }),
      ],
    }),
    defineField({name: 'submittedAt', type: 'datetime'}),
    defineField({
      name: 'fromCase',
      title: 'Scripted case',
      type: 'reference',
      to: [{type: 'case'}],
      weak: true,
      readOnly: true,
      description: 'Set when this application was played at the inspection window.',
    }),
    defineField({
      name: 'instanceId',
      title: 'Workflow instance',
      type: 'string',
      readOnly: true,
      description: 'The sanity.workflow.instance in the workflows dataset.',
    }),
    defineField({
      name: 'memos',
      title: 'Clerk memos',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'memo',
          fields: [
            defineField({name: 'at', type: 'datetime'}),
            defineField({name: 'from', type: 'string', description: 'Which agent wrote it'}),
            defineField({name: 'verdict', type: 'string'}),
            defineField({name: 'text', type: 'text'}),
            defineField({name: 'requestedForm', type: 'reference', to: [{type: 'form'}], weak: true}),
          ],
          preview: {select: {title: 'verdict', subtitle: 'text'}},
        }),
      ],
    }),
  ],
  preview: {select: {title: 'reference', subtitle: 'applicantName'}},
})

/** A line on a document the applicant hands over (a citizen card, a licence they already hold…). */
const paperLine = defineArrayMember({
  type: 'object',
  name: 'line',
  fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'value', type: 'string'})],
  preview: {select: {title: 'label', subtitle: 'value'}},
})

export const bulletin = defineType({
  name: 'bulletin',
  title: 'Daily bulletin',
  type: 'document',
  description: 'The rules handed to the inspector at the start of a shift.',
  fields: [
    defineField({name: 'day', type: 'number', validation: (r) => r.required().integer().min(1)}),
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'date', type: 'date', description: 'The in-game date. Expiry dates are checked against it.'}),
    defineField({name: 'rules', type: 'array', of: [defineArrayMember({type: 'string'})]}),
  ],
  preview: {select: {title: 'title', day: 'day'}, prepare: ({title, day}) => ({title: `Day ${day}`, subtitle: title})},
})

export const caseType = defineType({
  name: 'case',
  title: 'Scripted applicant',
  type: 'document',
  description:
    'An applicant for the inspector game. Truth is stored here and scored on the server. The clerk memo is authored: the clerk passed this file, and the inspector catches what it missed.',
  fields: [
    defineField({name: 'day', type: 'number', validation: (r) => r.required().integer().min(1)}),
    defineField({name: 'order', type: 'number'}),
    defineField({name: 'permitType', type: 'reference', to: [{type: 'permitType'}], validation: (r) => r.required()}),
    defineField({name: 'applicantName', type: 'string', validation: (r) => r.required()}),
    defineField({name: 'portrait', type: 'string', description: 'Seed for the generated pixel portrait.'}),
    defineField({name: 'greeting', type: 'string', description: 'What they say at the window.'}),
    defineField({
      name: 'answers',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'answer',
          fields: [defineField({name: 'key', type: 'string'}), defineField({name: 'answer', type: 'text', rows: 2})],
          preview: {select: {title: 'key', subtitle: 'answer'}},
        }),
      ],
    }),
    defineField({
      name: 'papers',
      title: 'Documents handed over',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'paper',
          fields: [
            defineField({name: 'kind', type: 'string', options: {list: ['citizen-card', 'licence', 'letter']}}),
            defineField({name: 'title', type: 'string'}),
            defineField({name: 'portrait', type: 'string', description: 'Photo seed, for cards with a photo.'}),
            defineField({name: 'lines', type: 'array', of: [paperLine]}),
          ],
          preview: {select: {title: 'title', subtitle: 'kind'}},
        }),
      ],
    }),
    defineField({name: 'clerkMemo', type: 'text', rows: 3, description: 'Authored. The clerk always passed these files.'}),
    defineField({
      name: 'truth',
      type: 'string',
      options: {list: ['approve', 'deny'], layout: 'radio'},
      validation: (r) => r.required(),
    }),
    defineField({name: 'reason', type: 'string', description: 'The discrepancy, shown when the inspector gets it wrong.'}),
    defineField({name: 'onApproved', type: 'string'}),
    defineField({name: 'onDenied', type: 'string'}),
  ],
  orderings: [{title: 'Day, order', name: 'dayOrder', by: [{field: 'day', direction: 'asc'}, {field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'applicantName', day: 'day', truth: 'truth', permit: 'permitType.title'},
    prepare: ({title, day, truth, permit}) => ({title, subtitle: `Day ${day} · ${permit} · ${truth}`}),
  },
})

export const shift = defineType({
  name: 'shift',
  title: 'Shift',
  type: 'document',
  description: 'One inspector shift. Results are written by the server from the workflow instances; the browser never reports its own score.',
  readOnly: true,
  fields: [
    defineField({name: 'player', type: 'string'}),
    defineField({name: 'day', type: 'number'}),
    defineField({name: 'status', type: 'string', options: {list: ['open', 'done']}}),
    defineField({name: 'startedAt', type: 'datetime'}),
    defineField({name: 'finishedAt', type: 'datetime'}),
    defineField({
      name: 'results',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'result',
          fields: [
            defineField({name: 'case', type: 'reference', to: [{type: 'case'}], weak: true}),
            defineField({name: 'reference', type: 'string'}),
            defineField({name: 'decision', type: 'string'}),
            defineField({name: 'correct', type: 'boolean'}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'queue',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'slot',
          fields: [defineField({name: 'reference', type: 'string'}), defineField({name: 'caseId', type: 'string'})],
        }),
      ],
    }),
    defineField({name: 'credits', type: 'number'}),
    defineField({name: 'citations', type: 'number'}),
    defineField({name: 'processed', type: 'number'}),
  ],
  preview: {select: {title: 'player', subtitle: 'credits'}},
})

export const schemaTypes = [application, permitType, form, department, caseType, bulletin, shift]
