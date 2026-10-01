import {createGoogleGenerativeAI} from '@ai-sdk/google'
import {type LanguageModel, wrapLanguageModel} from 'ai'

// Free-tier Gemini models intermittently return 503 "high demand" or hang. Each attempt gets
// ATTEMPT_TIMEOUT_MS; on failure the same request moves to the next model in the chain.
// (Carried over from the Path One build, where this bit us repeatedly.)
const GEMINI_CHAIN = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest']
const ATTEMPT_TIMEOUT_MS = 25_000

let cached: LanguageModel | undefined

export function model(): LanguageModel {
  if (cached) return cached
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY')
  const google = createGoogleGenerativeAI({apiKey})
  const primary = process.env.LLM_MODEL
  const chain = [...(primary ? [primary] : []), ...GEMINI_CHAIN.filter((id) => id !== primary)].map((id) => google(id))

  cached = wrapLanguageModel({
    model: chain[0],
    middleware: {
      wrapGenerate: async ({params}) => {
        let lastError: unknown
        for (const candidate of chain) {
          const attempt = new AbortController()
          const timer = setTimeout(() => attempt.abort(new Error('timeout')), ATTEMPT_TIMEOUT_MS)
          const signals = [attempt.signal, params.abortSignal].filter((s): s is AbortSignal => Boolean(s))
          try {
            return await candidate.doGenerate({...params, abortSignal: AbortSignal.any(signals)})
          } catch (error) {
            if (params.abortSignal?.aborted) throw error
            console.warn(`[model] ${candidate.modelId} unavailable, trying next model`)
            lastError = error
          } finally {
            clearTimeout(timer)
          }
        }
        throw lastError
      },
    },
  })
  return cached
}
