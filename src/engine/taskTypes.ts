import type { TaskTypeId } from '../types'

export interface TaskType {
  id: TaskTypeId
  label: string
  short: string
  minWords: number
  maxWords: number | null
  /** жёсткое требование: работа короче minWords не оценивается по критериям */
  hardMin?: number
  targetBand: string
  formality: 'formal' | 'informal' | 'neutral'
  /** максимум баллов по официальной шкале (ЕГЭ) */
  maxPoints?: number
  requirements: string[]
  checklist: string[]
}

export const TASK_TYPES: TaskType[] = [
  {
    id: 'ielts2',
    label: 'IELTS Writing Task 2 (эссе)',
    short: 'IELTS T2',
    minWords: 250,
    maxWords: null,
    targetBand: 'band 5.5 – 7.5',
    formality: 'formal',
    requirements: [
      'Не менее 250 слов — за меньшее снимают баллы',
      '4 критерия: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy',
      'Ответ на все части вопроса, позиция ясна во введении и заключении',
    ],
    checklist: [
      'Отвечает на все части вопроса',
      'Позиция сформулирована ясно и не меняется по тексту',
      'Есть введение, 2 основных абзаца, заключение',
      'На каждый аргумент есть пояснение или пример',
    ],
  },
  {
    id: 'ielts1',
    label: 'IELTS Writing Task 1 (график / процесс / карта)',
    short: 'IELTS T1',
    minWords: 150,
    maxWords: null,
    targetBand: 'band 5.5 – 7.5',
    formality: 'formal',
    requirements: ['Не менее 150 слов', 'Описание данных, а не объяснение причин', 'Есть overview с главными тенденциями'],
    checklist: ['Есть overview', 'Данные с цифрами из источника', 'Нет собственных оценок и выводов-домыслов', 'Сравнения и группировка данных'],
  },
  {
    id: 'ege38',
    label: 'ЕГЭ, задание 38 (развёрнутое письменное высказывание)',
    short: 'ЕГЭ 38',
    minWords: 180,
    maxWords: 275,
    hardMin: 138,
    targetBand: '12 из 14 баллов',
    formality: 'formal',
    maxPoints: 14,
    requirements: [
      'Объём 180–275 слов (допустимо 138–275)',
      'План из 5 пунктов, включая цифры и сравнение',
      'Максимум 14 баллов: К1–К5 + язык',
    ],
    checklist: [
      'Вступление с проектом и темой',
      '2–3 факта с цифрами',
      '1–2 сравнения с мнением и пояснением',
      'Проблема и пути её решения',
      'Заключение-вывод',
      'Связки между абзацами',
    ],
  },
  {
    id: 'email',
    label: 'Письмо другу (ЕГЭ 37 / ОГЭ 35)',
    short: 'Письмо',
    minWords: 100,
    maxWords: 140,
    hardMin: 90,
    targetBand: '6 из 6 баллов',
    formality: 'informal',
    maxPoints: 6,
    requirements: ['100–140 слов', 'Обращение и завершение по неформальному этикету', 'Ответы на все три вопроса друга'],
    checklist: [
      'Обращение (Hi …,)',
      'Благодарность и ссылка на предыдущее письмо',
      'Ответы на 3 вопроса',
      'Надежда на ответ / прощание',
      'Подпись без точки',
    ],
  },
  {
    id: 'formal-letter',
    label: 'Деловое письмо / письмо в организацию',
    short: 'Деловое письмо',
    minWords: 120,
    maxWords: 200,
    targetBand: 'задание выполнено',
    formality: 'formal',
    requirements: ['Формальный стиль и обращение Dear Sir or Madam / Dear Mr Smith', 'Не менее 120 слов', 'Цель письма обозначена в первом абзаце'],
    checklist: ['Обращение и подпись по формату', 'Цель письма указана', 'Все пункты задания раскрыты', 'Нет сокращений и разговорной лексики'],
  },
  {
    id: 'free',
    label: 'Свободный текст (проверка без привязки к экзамену)',
    short: 'Свободно',
    minWords: 60,
    maxWords: null,
    targetBand: 'по критериям CEFR',
    formality: 'neutral',
    requirements: ['Оценка по критериям CEFR (A2 – C1)', 'Проверка орфографии, грамматики и лексики'],
    checklist: ['Текст соответствует уровню ученика', 'Ошибки соответствуют пройденному материалу'],
  },
]

export const TASK_BY_ID = new Map(TASK_TYPES.map((t) => [t.id, t]))

export function taskType(id: TaskTypeId): TaskType {
  return TASK_BY_ID.get(id) ?? TASK_TYPES[TASK_TYPES.length - 1]
}
