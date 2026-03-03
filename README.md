# AI Operator Dashboard — Sales Workflow

A local web dashboard that runs an AI-powered sales workflow end-to-end. Enter a lead's details, watch five AI steps complete in real time, review and refine the outputs, then approve before anything is finalised.

**Nothing is ever sent automatically.** This is a local tool — no emails are sent, no CRM integrations, no external actions beyond calling the Anthropic API. The human reviews, edits, and sends manually.

---

## Quick Start

### Prerequisites

- **Node.js** 18 or later — [download here](https://nodejs.org/)
- **Anthropic API key** — [get one here](https://console.anthropic.com/)

### Step-by-step setup

1. **Open a terminal** (PowerShell on Windows, Terminal on Mac/Linux) and navigate to the project folder:

   ```bash
   cd path/to/ai-operator-dashboard
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create your environment file:**

   Copy the example file and add your API key:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` in a text editor and replace the placeholder with your actual Anthropic API key:

   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

4. **Start the app:**

   ```bash
   npm run dev
   ```

5. **Open your browser** and go to [http://localhost:3000](http://localhost:3000)

That's it — you should see the lead intake form ready to go.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-20250514` | Model to use for AI steps |
| `WORKSPACE_DIR` | No | `./sales-workflow` | Where run artefacts are stored |

## How It Works

### The Workflow (5 AI Steps)

When you submit a lead, the app runs five sequential AI steps, each building on the output of the previous:

1. **Lead Analyser** — Summarises the intake into a structured profile
2. **Follow-up Writer** — Drafts a short, warm follow-up email
3. **Proposal Drafter** — Creates a structured proposal with clear headings
4. **Quality Reviewer** — Reviews the email and proposal against the style guide, producing actionable suggestions tagged to each draft
5. **Checklist Compiler** — Produces a pre-send checklist with suggested edits and flags missing information

### Interactive QA Suggestions

The Quality Reviewer doesn't just produce a report — each suggestion is presented as an interactive card on the QA Review tab. You can:

- **Accept individual suggestions** — click "Accept" and Claude applies that specific change to the relevant draft (email or proposal)
- **Accept all at once** — click "Accept All" to apply every suggestion sequentially
- Accepted suggestions show a green "Applied" badge so you can track what's been changed

### Manual Editing

On the Email Draft and Proposal Draft tabs, click the **Edit** button (pencil icon) to open a text editor directly in the browser. Make your own changes, then click **Save Changes**. This lets you add personal touches, correct details, or rewrite sections before finalising.

### Approve & Finalise

Once you're happy with the drafts (after accepting QA suggestions and making manual edits), click **Approve & Finalise**. This copies the drafts to the `final/` folder with a timestamp header. You can also **Regenerate** to re-run the workflow with the same lead data if you want a fresh set of outputs.

## Demo Data

The app includes two pre-built demo leads to help you test quickly:

- **Demo: Sarah Chen** — Head of Operations at Meridian Health Partners (healthcare workflow automation)
- **Demo: Jane Hamlett** — Operations Manager at Peakview Care Services Ltd (linen inventory management system)

Click either button on the home page to fill the form instantly.

## Where Files Are Stored

All run artefacts are stored as plain markdown files on your computer:

```
sales-workflow/
  style_guide.md              # Tone and rules for AI-generated content
  latest/                     # Always mirrors the most recent run's outputs
  runs/<RUN_ID>/
    input.json                # Original lead data
    state.json                # Step statuses and timestamps
    suggestions.json          # Parsed QA suggestions with acceptance state
    log.jsonl                 # Append-only run log
    context/
      01_lead_summary.md
      04_qa_review.md
      05_send_checklist.md
    drafts/
      02_followup_email_draft.md
      03_proposal_draft.md
    final/                    # Populated after "Approve & Finalise"
      02_followup_email.md
      03_proposal.md
```

Everything is plain files — no database, no lock-in. You can open, edit, and share these files directly.

## Customisation

### Style Guide

Edit `sales-workflow/style_guide.md` to match your brand voice. The QA Reviewer checks all drafts against this guide, so the more specific you make it, the better the outputs will reflect your tone and standards.

### Prompts

The AI prompts for each step are in `src/lib/prompts.ts`. You can adjust these to change how the AI writes emails, structures proposals, or reviews quality.

### Form Fields

The lead intake form is in `src/app/page.tsx`. You can add, remove, or rename fields to match the information you typically capture about leads.

## Manual Test Checklist

- [ ] `npm install && npm run dev` starts without errors
- [ ] Home page loads with empty form
- [ ] "Demo: Sarah Chen" and "Demo: Jane Hamlett" buttons fill all fields
- [ ] Validation: submitting with empty Name shows error
- [ ] Validation: submitting with no Context AND no Pain Points shows error
- [ ] "Run Workflow" creates a run and redirects to results page
- [ ] Progress steps update from Queued → Running → Done
- [ ] All four tabs show content after completion
- [ ] QA Review tab shows interactive suggestion cards
- [ ] Accepting a suggestion updates the relevant draft
- [ ] "Accept All" applies all suggestions sequentially
- [ ] Edit button appears on Email Draft and Proposal Draft tabs
- [ ] Manual edits save successfully and persist
- [ ] Run log shows timestamped entries for all actions
- [ ] "Approve & Finalise" copies drafts to final/ with timestamp
- [ ] "Regenerate" creates a new run with the same input
- [ ] "New Lead" returns to the form
- [ ] `sales-workflow/latest/` contains the most recent outputs
- [ ] `sales-workflow/runs/<ID>/` contains all artefacts
- [ ] Concurrent run attempt returns "Run already in progress" error
- [ ] Missing API key shows a friendly error in the UI
