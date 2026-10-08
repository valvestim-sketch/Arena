import type { TaskTypeId } from '../types'

export interface Sample {
  id: string
  title: string
  taskType: TaskTypeId
  topic: string
  text: string
}

export const SAMPLES: Sample[] = [
  {
    id: 'weak-essay',
    title: 'Слабый текст B1: «Социальные сети»',
    taskType: 'ielts2',
    topic: 'Social media: advantages and disadvantages',
    text: `Nowadays, many people thinks that social media is very good thing for the society. There is many opinions about this topic, but I am agree that social networks have more advantages than disadvantages, becouse they help us to stay in touch.

First of all, social media help people to communicate. For example, my sister have friends in another country and they was talking every day through internet. Also people can find informations and useful advices there, and it is easy to make a photo and share it with friends. Besides, you can listen music together or watch films, wich is very good entertainment for young people.

However, there is also disadvantages. Some people spends all day online and do mistakes in real life. They dont want to work because they very like games. The most of people in my city have this problem, and it is more worse than it looks. Also students can wait me for hours while I check my phone, and my mother always says that I must to sleep more.

In conclusion, I think yes, social media is useful, but we must to use it carefully. In my opinion I think that schools should teach children how to use internet in a right way. If the government will do it, the situation becomes better. It is very important for our future and for our childrens, so we need to think about it more serious. Also teachers can explain us how to be safe online.`,
  },
  {
    id: 'strong-essay',
    title: 'Сильный текст C1: «Удалённая работа»',
    taskType: 'ielts2',
    topic: 'Remote work: benefits and challenges',
    text: `In recent years, remote work has evolved from a rare privilege into a mainstream arrangement, and this shift has provoked a heated debate about its long-term consequences. While some commentators argue that working from home undermines team spirit, I believe the benefits clearly outweigh the drawbacks, provided that companies address the challenges thoughtfully.

On the one hand, remote work offers flexibility that traditional offices cannot match. Employees who no longer commute for two hours a day can devote that time to their families or to professional development, which inevitably improves their quality of life. Moreover, since companies save money on office space, many of them reinvest these savings in training programmes and competitive salaries. A recent survey conducted in twelve European countries revealed that productivity rose by eighteen per cent after the transition to hybrid schedules.

On the other hand, the drawbacks are real and should not be dismissed. Isolation is perhaps the most serious issue: employees who rarely meet their colleagues may feel disconnected from the company culture, and newcomers often struggle to learn from more experienced staff. Furthermore, the boundary between work and private life tends to blur, particularly when a spare room doubles as an office.

In conclusion, although remote work undoubtedly creates difficulties such as isolation and blurred boundaries, its advantages in terms of flexibility and productivity are considerable. What matters most is the approach: employers who invest in clear communication, regular meetings and sensible expectations will reap the rewards, whereas those who simply send everyone home are likely to struggle.`,
  },
  {
    id: 'email-friend',
    title: 'Письмо другу: планы на выходные',
    taskType: 'email',
    topic: 'Weekend plans',
    text: `Hi Alex,

Thanks for your letter! It was great to hear from you. Sorry I didnt answer earlier, I was busy with my exams.

You asked me about my weekend plans. On Saturday I am going to visit my grandparents, they live in a small village near Samara. We will help them in the garden and then my granny will cook her famous apple pie. On Sunday I want to go to the cinema with Kate, we are going to watch a new comedy. Also I am read a book about travels now.

By the way, you wrote that you started playing basketball. How often do you train? Is it difficult for you?

I have to go now, my mum is calling me. Write back soon!

Best wishes,
Ivan`,
  },
  {
    id: 'ege38',
    title: 'ЕГЭ 38: «Онлайн-обучение»',
    taskType: 'ege38',
    topic: 'Online education (55% онлайн, 45% офлайн)',
    text: `Online education has become a popular topic for discussion. In my project I have found some data about it and now I would like to analyse it.

As you can see from the chart, the most popular form of study is online lessons: 55% of the respondents chose it, while 45% prefer traditional classes. The reason is that online lessons save time and money.

Comparing the two forms of education, I can say that they differ significantly. Online lessons are more flexible, whereas offline classes give more opportunities for live communication. What is more, offline lessons help students to concentrate better, but they are more expensive.

The problem of the project is that many students cannot organise their time well. To solve this problem, I can suggest making a clear timetable and using special apps. Also it is important to take regular breaks.

In conclusion, I would like to say that both forms of education have their advantages. In my opinion, a mix of online and offline lessons is the best choice.

I am going to continue my project and find out more about this problem.`,
  },
]
