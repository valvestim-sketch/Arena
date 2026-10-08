import { expectedGap, judge, normalize } from '../src/lib/answerCheck'

let pass = 0, fail = 0
function eq(name: string, actual: unknown, want: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(want)
  if (ok) pass++; else { fail++; console.log(`✗ ${name}: получили ${JSON.stringify(actual)}, ждали ${JSON.stringify(want)}`) }
}

// --- expectedGap
eq('гэп: are', expectedGap('There ______ many opinions about this topic.', 'There are many opinions about this topic.'), 'are')
eq('гэп: does', expectedGap('If the government ______ it, the situation changes.', 'If the government does it, the situation changes.'), 'does')
eq('гэп в начале', expectedGap('______ is very important for our future.', 'It is very important for our future.'), 'It')
eq('гэп в конце', expectedGap('People can find useful information ______.', 'People can find useful information online.'), 'online')
eq('окно с многоточием', expectedGap('…she lives in a small village. We will help ______ in the garden.', '…she lives in a small village. We will help them in the garden.'), 'them')
eq('два пробела в маске', expectedGap('My sister ______ abroad with her family.', 'My sister lives abroad with her family.'), 'lives')
eq('нет маски', expectedGap('I think yes', 'I think so'), 'I think so')

// --- judge
eq('точный ответ', judge('are', 'are', 'There are many opinions.'), 'correct')
eq('с большой буквы и точкой', judge('Are.', 'are', 'There are many.'), 'correct')
eq('опечатка 1 буква', judge('becuase', 'because', 'because'), 'typo')
eq('опечатка в длинном', judge('enviroment', 'environment', 'environment'), 'typo')
eq('неверный ответ', judge('is', 'are', 'There are many.'), 'wrong')
eq('пустой ответ', judge('   ', 'are', 'There are many.'), 'wrong')
eq('слово целиком в предложении', judge('is', 'is', 'is'), 'correct')
eq('ответ предложением', judge('There are many opinions about this topic.', 'are', 'There are many opinions about this topic.'), 'correct')
eq('апостроф другой формы', judge('didn’t', "didn't", "didn't"), 'correct')
eq('лишние пробелы', judge('  are  ', 'are', 'There are.'), 'correct')
eq('регистр', judge('BECAUSE', 'because', 'because'), 'correct')

// --- normalize
eq('нормализация', normalize("Don’t — “test”,  yes!"), "don't test yes")
eq('апострофы приводятся к одному виду', normalize('Don’t'), normalize("Don't"))
eq('кириллица не ломает', judge('привет', 'hello', 'hello'), 'wrong')

console.log(`\nпройдено: ${pass}, провалено: ${fail}`)
process.exit(fail ? 1 : 0)
