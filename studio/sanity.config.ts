import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Bureau of Imaginary Permits',
  projectId: 'e23lrcxv',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('The Bureau')
          .items([
            S.documentTypeListItem('application').title('Applications'),
            S.divider(),
            S.documentTypeListItem('permitType').title('Permit types'),
            S.documentTypeListItem('form').title('Forms'),
            S.documentTypeListItem('department').title('Departments'),
            S.divider(),
            S.documentTypeListItem('bulletin').title('Inspector: daily bulletins'),
            S.documentTypeListItem('case').title('Inspector: scripted applicants'),
            S.documentTypeListItem('shift').title('Inspector: shifts'),
          ]),
    }),
    visionTool({defaultApiVersion: '2026-04-29'}),
  ],
  schema: {types: schemaTypes},
})
