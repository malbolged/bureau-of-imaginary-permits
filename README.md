# Bureau of Imaginary Permits

A pixel-art inspection-booth game about bureaucracy for things that don't exist, built on Sanity Workflows.

**Play:** https://bureau-of-imaginary-permits.vercel.app/shift (no account needed)

You take the window. Applicants step up one by one, wanting a Licence to Whistle on Tuesdays, a Permit to Keep a Small Dragon (Indoor), or the Deed to a Medium-Sized Cloud. Each hands over a Citizen Card, an application, and sometimes a licence they already hold.

The AI clerk has already passed every file. The clerk is tired. Your job is to compare the papers against the Rulebook and the day's bulletin, stamp APPROVED or DENIED, and hand them back. Wrong stamps print a citation. Day 2 changes the rules.

There is also a real citizen side. Anyone can [file a permit](https://bureau-of-imaginary-permits.vercel.app/permits): a real AI clerk (Gemini) reads it, a second AI (the Ministry of Weather) rules on anything in the sky, and human officials stamp it in an App SDK app inside the Sanity dashboard.

**Sanity project:** `e23lrcxv`. Public datasets: `production` (content) and `workflows` (engine state). Example: [Day 2's scripted applicants](https://e23lrcxv.api.sanity.io/v2026-04-29/data/query/production?query=*%5B_type%3D%3D%22case%22%26%26day%3D%3D2%5D%7BapplicantName%2C%22permit%22%3ApermitType-%3Etitle%2CclerkMemo%7D). The `truth` and `reason` fields are on the documents too, so don't peek before playing.

Built for the [DEV Sanity Challenge](https://dev.to/devteam/join-the-sanity-challenge-2500-in-prizes-for-five-winners-514m), Path Two. Visually inspired by inspection-booth games; all art, text and sound are original.

## How it works

```
permitType ──workflow──▶ sanity.workflow.definition   (4 chains, deployed as data, `workflows` dataset)
     │                              │
application ◀──subject── sanity.workflow.instance     (one per application: stage, fields, history)
     │   ▲                          │
     │   └─ case (scripted applicant: papers, authored clerk memo, truth)    ← the game
     └── memos[] ◀── effects: clerk-review, weather-review                  ← AI agents
                                    ▲
       actions: approve / deny (inspector at the window · official in the App SDK Stamp Desk) · resubmit (citizen)
```

- **Approval chains are data.** There are four [Sanity Workflows](https://www.sanity.io/docs/workflows/introduction) definitions in `workflows/src/definitions.ts`, deployed with `sanity-workflows deploy`. Every transition is a GROQ condition over the instance.

  | Chain | Steps |
  |---|---|
  | `express-permit` | AI clerk only |
  | `standard-permit` | AI clerk, then one human stamp |
  | `sky-permit` | AI clerk, Ministry of Weather AI, Under-Secretary, Minister |
  | `booth-inspection` | Straight to the inspection window (the game) |

- **The game is real workflow traffic.** Starting a shift turns the day's `case` documents into applications with `booth-inspection` instances. The inspector's stamp is a `fireAction`. The server scores it from the decision recorded on the instance against `case.truth`, so the browser never reports its own score. Shifts are `shift` documents, which feed the leaderboard.
- **Agents are effects.** On the citizen side, the engine queues `clerk-review` and `weather-review` and the Next.js server drains them (`workflows/src/server/agents.ts`). Guardrails live in code:
  - Prerequisite permits are verified against the issued instance.
  - The clerk may only request forms attached to that permit type.
  - After two returns, the file is "passed for stamping out of sheer fatigue".
- **Humans are actions.** Staff stamp citizen files in the **Stamp Desk** (`desk/`), an App SDK app built on `@sanity/workflow-sdk`. `useWorkflowInstances` gives a live in-tray, and `useWorkflowSession` drives each file, so stamps are recorded under the official's own Sanity identity. The engine refuses any action the current stage doesn't offer.
- **Honesty note.** The clerk memos on scripted cases are *authored*. Every file at the window arrives with the clerk's ruling "complete", because that's the premise. Real citizen applications go through the real AI clerk.

## Repo

| Path | What |
|---|---|
| `workflows/` | Workflow definitions, deploy config (`sanity.workflow.ts`), server runtime (engine, agents, shifts, view model), smoke-test scripts |
| `web/` | Next.js 16: the shift game (`/shift`), lobby, citizen flow (`/permits`, `/apply`, `/file`), officials' desk, leaderboard, "How it works" (renders the deployed definitions) |
| `desk/` | Stamp Desk, an App SDK app deployed to the Sanity dashboard |
| `studio/` | Sanity Studio: schema (`department`, `form`, `permitType`, `application`, `case`, `bulletin`, `shift`) and seed data (`scripts/data.ts`, `scripts/cases.ts`) |
| `BUILD-LOG.md` | Decisions, dead ends and fixes, written as they happened |

## Run it

```bash
pnpm install
cp .env.example .env                # SANITY_WRITE_TOKEN (editor) + GOOGLE_GENERATIVE_AI_API_KEY
pnpm seed                           # departments, forms, permit types, bulletins, scripted applicants
pnpm workflows:deploy               # deploy the four workflow definitions
pnpm dev:web                        # http://localhost:3000, then play at /shift
pnpm dev:desk                       # Stamp Desk, opens inside the Sanity dashboard
```

Play a whole shift without a browser (scores against the stored truth):

```bash
cd workflows && pnpm exec dotenv -e ../.env -- tsx scripts/shift-smoke.ts
```
