export interface LeadInput {
  name: string;
  company: string;
  role: string;
  email: string;
  website: string;
  linkedin: string;
  source: string;
  context: string;
  painPoints: string;
  timeline: string;
  budget: string;
  offerSummary: string;
  notes: string;
}

export type StepStatus = 'queued' | 'running' | 'done' | 'error';

export interface StepState {
  name: string;
  label: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface RunState {
  runId: string;
  status: 'running' | 'completed' | 'error' | 'finalised';
  createdAt: string;
  completedAt?: string;
  finalisedAt?: string;
  steps: StepState[];
}

export interface LogLine {
  timestamp: string;
  step?: string;
  message: string;
  level: 'info' | 'error' | 'warn';
}

export interface QASuggestion {
  id: string;
  type: 'email' | 'proposal';
  text: string;
  accepted: boolean;
  appliedAt?: string;
}

export interface RunResponse {
  state: RunState;
  outputs: {
    leadSummary?: string;
    emailDraft?: string;
    proposalDraft?: string;
    qaReview?: string;
    sendChecklist?: string;
    emailFinal?: string;
    proposalFinal?: string;
  };
  suggestions?: QASuggestion[];
  log: LogLine[];
}
