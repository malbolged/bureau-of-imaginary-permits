'use client'

import {useRouter} from 'next/navigation'
import {useState} from 'react'

import type {PermitDetail} from '@/lib/catalogue'

export function ApplicationForm({slug, requirements}: {slug: string; requirements: PermitDetail['requirements']}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    const answers = Object.fromEntries(requirements.map((r) => [r.key, String(data.get(r.key) ?? '')]))
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({permitSlug: slug, applicantName: data.get('applicantName'), answers}),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'The Bureau could not accept this application.')
      router.push(`/file/${body.reference}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-6 px-5 py-6 sm:px-8"
      onSubmit={(e) => {
        e.preventDefault()
        void submit(e.currentTarget)
      }}
    >
      <Field n={1} label="Full name of applicant">
        <input name="applicantName" aria-label="Full name of applicant" required maxLength={80} autoComplete="name" className="field" />
      </Field>

      {requirements.map((r, i) => (
        <Field key={r.key} n={i + 2} label={r.question}>
          {r.kind === 'long-text' ? (
            <textarea name={r.key} aria-label={r.question} required rows={3} maxLength={1200} className="field resize-y" />
          ) : r.kind === 'yes-no' ? (
            <div className="flex gap-6 pt-1 text-[21px]">
              {['Yes', 'No', 'Not sure'].map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input type="radio" name={r.key} value={v} required className="size-4 accent-[#2a251f]" /> {v}
                </label>
              ))}
            </div>
          ) : (
            <input name={r.key} aria-label={r.question} required type={r.kind === 'number' ? 'number' : 'text'} maxLength={300} className="field" />
          )}
        </Field>
      ))}

      <details className="text-[19px] leading-[1.1] text-ink-soft">
        <summary className="cursor-pointer select-none font-tiny text-[11px] uppercase tracking-[0.1em] text-ink">Guidance notes (Form G-1)</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {requirements.map((r) => r.clerkCheck && <li key={r.key}>{r.clerkCheck}</li>)}
        </ul>
      </details>

      <div className="flex flex-wrap items-center gap-4 border-t-4 border-ink pt-5">
        <button disabled={busy} className="btn btn-lamp px-5 py-3 text-[14px]">
          {busy ? 'Opening a file…' : 'Submit to the Bureau'}
        </button>
        <p className="text-[18px] leading-[1.1] text-ink-soft">By submitting you declare the above to be imaginary and true.</p>
      </div>
      {error && (
        <p role="alert" className="border-4 border-deny px-3 py-2 text-[20px] text-deny">
          {error}
        </p>
      )}
    </form>
  )
}

function Field({n, label, children}: {n: number; label: string; children: React.ReactNode}) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-x-2">
      <span className="pt-0.5 font-tiny text-[12px] text-ink-soft">{String(n).padStart(2, '0')}</span>
      <fieldset className="block min-w-0">
        <legend className="text-[22px] leading-[1.05]">{label}</legend>
        <div className="mt-1">{children}</div>
      </fieldset>
    </div>
  )
}
