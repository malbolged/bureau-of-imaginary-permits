/** Where the engine keeps its data, shared by the server runtime, the stamp desk and the deploy config. */
export const PROJECT_ID = 'e23lrcxv'
export const CONTENT_DATASET = 'production'
export const WORKFLOW_DATASET = 'workflows'
export const WORKFLOW_TAG = 'prod'
export const WORKFLOW_RESOURCE = {type: 'dataset' as const, id: `${PROJECT_ID}.${WORKFLOW_DATASET}`}
