import {SanityApp} from '@sanity/sdk-react'
import {WorkflowTelemetryProvider} from '@sanity/workflow-sdk'
import {Suspense} from 'react'

import {CONTENT_DATASET, PROJECT_ID} from '@bureau/workflows/config'

import {Desk} from './Desk'
import './App.css'

function Loading({label = 'Opening the in-tray…'}: {label?: string}) {
  return <p className="loading">{label}</p>
}

export default function App() {
  return (
    <SanityApp config={{projectId: PROJECT_ID, dataset: CONTENT_DATASET}} fallback={<Loading label="Signing in…" />}>
      <WorkflowTelemetryProvider>
        <Suspense fallback={<Loading />}>
          <Desk />
        </Suspense>
      </WorkflowTelemetryProvider>
    </SanityApp>
  )
}
