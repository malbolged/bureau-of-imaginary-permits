import {defineWorkflowConfig} from '@sanity/workflow-engine/define'

import {WORKFLOW_RESOURCE, WORKFLOW_TAG} from './src/config'
import {definitions} from './src/definitions'

export default defineWorkflowConfig({
  deployments: [
    {
      name: 'production',
      tag: WORKFLOW_TAG,
      expectedMinReaderModel: 10,
      workflowResource: WORKFLOW_RESOURCE,
      definitions,
    },
  ],
})
