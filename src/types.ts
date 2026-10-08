export type Category = 'spelling' | 'grammar' | 'lexis' | 'punctuation' | 'style'

export type Severity = 'error' | 'warning' | 'note'

export type Formality = 'formal' | 'informal' | 'neutral'

export interface Issue {
  ruleId: string
  category: Category
  severity: Severity
  title: string
  explanation: string
  example?: string
  start: number
  end: number
  found: string
  suggestion: string | null
  /** вес для оценки; по умолчанию берётся из важности */
  weight?: number
}

export interface Span {
  start: number
  end: number
  text: string
}

export interface WordFreq {
  word: string
  count: number
}

export interface DocStats {
  words: number
  sentences: number
  paragraphs: number
  chars: number
  uniqueContent: number
  contentTokens: number
  avgWordLength: number
  avgSentenceLength: number
  longestSentence: { text: string; words: number; index: number } | null
  shortSentences: number
  linkers: string[]
  advanced: string[]
  basicWords: WordFreq[]
  repeatedWords: WordFreq[]
  paragraphWordCounts: number[]
}

export type CriterionId = 'task' | 'coherence' | 'lexis' | 'grammar'

export interface CriterionResult {
  id: CriterionId
  name: string
  score: number
  comment: string
  strengths: string[]
  weaknesses: string[]
}

export interface Exercise {
  id: string
  kind: 'fix' | 'choose'
  ruleTitle: string
  task: string
  sentence: string
  options?: string[]
  answer: string
  hint: string
}

export interface Analysis {
  issues: Issue[]
  stats: DocStats
  criteria: CriterionResult[]
  band: number
  cefr: string
  percent: number
  categoryCounts: Record<Category, number>
  ruleFreq: { ruleId: string; title: string; category: Category; count: number }[]
  exercises: Exercise[]
  studentMessage: string
  byParagraph: { index: number; start: number; end: number; words: number }[]
}

/* ---------- данные, которые хранятся у учителя ---------- */

export type TaskTypeId =
  | 'ielts2'
  | 'ielts1'
  | 'ege38'
  | 'email'
  | 'formal-letter'
  | 'free'

export interface Student {
  id: string
  name: string
  level: string
  goal: string
  note: string
  createdAt: number
}

export interface SavedCheck {
  id: string
  studentId: string
  taskType: TaskTypeId
  topic: string
  text: string
  createdAt: number
  band: number
  wordCount: number
  issues: number
  ruleFreq: Analysis['ruleFreq']
  categories: Record<Category, number>
  studentMessage: string
  exercises: Exercise[]
  criteria: CriterionResult[]
  stats: DocStats
}

/* ---------- совместный режим: тренажёры для учеников ---------- */

export interface SubmissionAnswer {
  id: string
  given: string | null
  correct: boolean
}

export interface Submission {
  id: string
  studentName: string
  answers: SubmissionAnswer[]
  right: number
  total: number
  startedAt: number
  finishedAt: number
}

export interface Assignment {
  code: string
  studentId: string
  studentName: string
  title: string
  taskLabel: string
  topic: string
  band: number
  createdAt: number
  exercises: Exercise[]
  submissions: Submission[]
  lastSubmission?: Submission | null
  best?: number | null
}
