import {
  defineAction,
  defineActivity,
  defineField,
  defineStage,
  defineTransition,
  defineWorkflow,
} from '@sanity/workflow-engine/define'

/**
 * The Bureau's approval chains. Each permitType document names one of these by `workflow`.
 * They are deployed into the `workflows` dataset as sanity.workflow.definition documents,
 * so the process lives as data next to the content it governs.
 */

const CLERK = 'clerk-review'
const clerkSays = (verdict: string) => `$allActivitiesDone && $effects['${CLERK}'].verdict == '${verdict}'`

/** Intake: the AI clerk reads the application against the permit's requirements. */
function intake(next: string) {
  return defineStage({
    name: 'intake',
    title: 'Clerk intake',
    description: 'The AI clerk checks the paperwork against the permit requirements.',
    activities: [
      defineActivity({
        name: 'review',
        title: 'Clerk reviews the paperwork',
        actions: [
          defineAction({
            name: 'start-review',
            title: 'Hand the file to the clerk',
            when: 'true',
            effects: [
              {
                name: CLERK,
                bindings: {subject: '$fields.subject._id', citizenReply: '$fields.citizenReply'},
                outputs: [
                  {type: 'string', name: 'verdict'},
                  {type: 'string', name: 'memo'},
                  {type: 'string', name: 'requestedForm'},
                ],
              },
            ],
          }),
          defineAction({
            name: 'reviewed',
            title: 'Clerk has ruled',
            when: `$effectStatus['${CLERK}'] == 'done'`,
            status: 'done',
          }),
          defineAction({
            name: 'clerk-unwell',
            title: 'Clerk is unwell',
            when: `$effectStatus['${CLERK}'] == 'failed'`,
            status: 'failed',
          }),
        ],
      }),
    ],
    transitions: [
      defineTransition({
        name: 'too-real',
        title: 'Refer elsewhere (this thing exists)',
        description: 'The Bureau only licenses imaginary things.',
        to: 'referred',
        when: clerkSays('too-real'),
      }),
      defineTransition({
        name: 'needs-paperwork',
        title: 'Request more paperwork',
        to: 'awaiting-citizen',
        when: clerkSays('incomplete'),
      }),
      defineTransition({name: 'in-order', title: 'Paperwork in order', to: next, when: clerkSays('complete')}),
    ],
  })
}

/** The citizen answers the clerk's request; the file goes back to intake. */
const awaitingCitizen = defineStage({
  name: 'awaiting-citizen',
  title: 'Awaiting the citizen',
  description: 'The clerk asked for a form. The citizen fills it in and resubmits.',
  activities: [
    defineActivity({
      name: 'supply',
      title: 'Supply the requested form',
      actions: [
        defineAction({
          name: 'resubmit',
          title: 'Resubmit',
          status: 'done',
          params: [{type: 'string', name: 'reply', title: 'Your answer', required: true}],
          ops: [{type: 'field.set', target: {field: 'citizenReply'}, value: {type: 'param', param: 'reply'}}],
        }),
      ],
    }),
  ],
  transitions: [defineTransition({name: 'back-to-intake', title: 'Back to the clerk', to: 'intake'})],
})

/** A human stamp. `next` is where an approval goes; `signer` is the field that records who stamped. */
function stamping(name: string, title: string, next: string, signer = 'stampedBy') {
  const decision = `${name}Decision`
  return defineStage({
    name,
    title,
    description: 'A human official stamps the application. Their identity is recorded on the instance.',
    fields: [defineField({type: 'string', name: decision})],
    activities: [
      defineActivity({
        name: 'stamp',
        title: `${title}: stamp the file`,
        actions: [
          defineAction({
            name: 'approve',
            title: 'Stamp APPROVED',
            status: 'done',
            ops: [
              {type: 'field.set', target: {field: decision}, value: {type: 'literal', value: 'approve'}},
              {type: 'field.set', target: {field: signer}, value: {type: 'actor'}},
            ],
          }),
          defineAction({
            name: 'deny',
            title: 'Stamp DENIED',
            status: 'done',
            params: [{type: 'string', name: 'reason', title: 'Grounds for denial', required: true}],
            ops: [
              {type: 'field.set', target: {field: decision}, value: {type: 'literal', value: 'deny'}},
              {type: 'field.set', target: {field: 'denialReason'}, value: {type: 'param', param: 'reason'}},
              {type: 'field.set', target: {field: signer}, value: {type: 'actor'}},
            ],
          }),
        ],
      }),
    ],
    transitions: [
      defineTransition({name: `${name}-approved`, title: 'Approved', to: next, when: `$allActivitiesDone && $fields.${decision} == 'approve'`}),
      defineTransition({name: `${name}-denied`, title: 'Denied', to: 'denied', when: `$allActivitiesDone && $fields.${decision} == 'deny'`}),
    ],
  })
}

/** Ministry of Weather: a second agent that rules on anything involving the sky. */
const meteorology = defineStage({
  name: 'meteorology',
  title: 'Ministry of Weather review',
  description: 'A second AI agent checks the request against the forecast and existing sky allocations.',
  activities: [
    defineActivity({
      name: 'forecast',
      title: 'Consult the Ministry of Weather',
      actions: [
        defineAction({
          name: 'ask',
          title: 'Ask the Ministry',
          when: 'true',
          effects: [
            {
              name: 'weather-review',
              bindings: {subject: '$fields.subject._id'},
              outputs: [
                {type: 'string', name: 'verdict'},
                {type: 'string', name: 'memo'},
              ],
            },
          ],
        }),
        defineAction({name: 'ruled', title: 'Ministry has ruled', when: "$effectStatus['weather-review'] == 'done'", status: 'done'}),
        defineAction({name: 'ministry-closed', title: 'Ministry closed', when: "$effectStatus['weather-review'] == 'failed'", status: 'failed'}),
      ],
    }),
  ],
  transitions: [
    defineTransition({name: 'sky-clear', title: 'Sky clear', to: 'stamping', when: "$allActivitiesDone && $effects['weather-review'].verdict == 'favourable'"}),
    defineTransition({name: 'sky-taken', title: 'Sky already allocated', to: 'denied', when: "$allActivitiesDone && $effects['weather-review'].verdict == 'unfavourable'"}),
  ],
})

const issued = defineStage({name: 'issued', title: 'Permit issued', description: 'Terminal. The permit is valid.'})
const denied = defineStage({name: 'denied', title: 'Denied', description: 'Terminal. An official said no.'})
const referred = defineStage({name: 'referred', title: 'Referred elsewhere', description: 'Terminal. The thing exists; try a real office.'})

const fields = [
  defineField({type: 'subject', name: 'subject', title: 'Application', required: true, initialValue: {type: 'input'}}),
  defineField({type: 'string', name: 'citizenReply'}),
  defineField({type: 'actor', name: 'stampedBy'}),
  defineField({type: 'actor', name: 'countersignedBy'}),
  defineField({type: 'string', name: 'denialReason'}),
]

/** Clerk, then one Under-Secretary. */
export const standardPermit = defineWorkflow({
  name: 'standard-permit',
  title: 'Standard permit',
  description: 'AI clerk intake, then a human Under-Secretary stamps it.',
  initialStage: 'intake',
  fields,
  stages: [intake('stamping'), awaitingCitizen, stamping('stamping', "Under-Secretary's desk", 'issued'), issued, denied, referred],
})

/** Clerk only: minor whimsy is issued on the spot. */
export const expressPermit = defineWorkflow({
  name: 'express-permit',
  title: 'Express permit',
  description: 'Minor whimsy. The AI clerk issues it if the paperwork is in order. No human stamp.',
  initialStage: 'intake',
  fields,
  stages: [intake('issued'), awaitingCitizen, issued, referred],
})

/** Anything in the sky: clerk, Ministry of Weather agent, Under-Secretary, then the Minister countersigns. */
export const skyPermit = defineWorkflow({
  name: 'sky-permit',
  title: 'Sky permit',
  description: 'Clouds, rainbows, moons. Two agents, then two human signatures.',
  initialStage: 'intake',
  fields,
  stages: [
    intake('meteorology'),
    awaitingCitizen,
    meteorology,
    stamping('stamping', "Under-Secretary's desk", 'countersign'),
    stamping('countersign', "Minister's countersignature", 'issued', 'countersignedBy'),
    issued,
    denied,
    referred,
  ],
})

/**
 * The inspector game. Scripted applicants land straight at the window: the clerk has already
 * passed them (that memo is authored, see the case documents), and the player stamps.
 */
export const boothInspection = defineWorkflow({
  name: 'booth-inspection',
  title: 'Booth inspection',
  description: 'A scripted applicant at the inspection window. The AI clerk passed the paperwork; the inspector stamps it.',
  initialStage: 'window',
  fields,
  stages: [stamping('window', 'Inspection window', 'issued'), issued, denied],
})

export const definitions = [standardPermit, expressPermit, skyPermit, boothInspection]

export type WorkflowName = (typeof definitions)[number]['name']

/** Stages a human acts in, for the stamp desk. */
export const HUMAN_STAGES = ['stamping', 'countersign'] as const
export const TERMINAL_STAGES = ['issued', 'denied', 'referred'] as const
