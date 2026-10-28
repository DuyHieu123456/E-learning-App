// Quiz content — E-Learning App
// End-of-course multiple-choice quizzes. This is COURSE CONTENT (like the
// catalog): the live copy lives in the Supabase table `quiz_questions`
// and api.ts fetches it via fetchQuizForCourse(); this file is the local
// fallback + the source the SQL seed is generated from. Only the flagship
// UX course ships a quiz for now; other courses show "no quiz yet".

import type { QuizQuestion } from './types';

export const mockQuizzes: QuizQuestion[] = [
  {
    id: 'quiz-ux-1', courseId: 'c-ux-research',
    question: 'What is the main goal of UX research?',
    options: ['Make the interface prettier', "Understand users' behaviors, needs and motivations", 'Sell more advertising space', 'Choose the brand color palette'],
    correctIndex: 1,
    explanation: 'UX research exists to understand users so design decisions are based on evidence, not taste.',
  },
  {
    id: 'quiz-ux-2', courseId: 'c-ux-research',
    question: 'How many participants are typically enough to uncover most usability problems in one test round?',
    options: ['20', '2', '5', '50'],
    correctIndex: 2,
    explanation: 'Around 5 participants per round reveal roughly 85% of usability issues (Nielsen); iterate with more rounds instead.',
  },
  {
    id: 'quiz-ux-3', courseId: 'c-ux-research',
    question: 'Which method best answers "WHY do users abandon checkout?"',
    options: ['Heatmaps', 'A/B testing', 'User interviews', 'Server logs'],
    correctIndex: 2,
    explanation: 'Analytics show WHERE users drop off; interviews reveal the reasons and motivations behind it.',
  },
  {
    id: 'quiz-ux-4', courseId: 'c-ux-research',
    question: 'What should a UX research plan define FIRST?',
    options: ['The final report template', 'The recruiting script', 'Tool licenses to buy', 'Research goals and questions'],
    correctIndex: 3,
    explanation: 'Goals and questions drive every later choice: methods, participants and tasks.',
  },
  {
    id: 'quiz-ux-5', courseId: 'c-ux-research',
    question: 'During a usability test, the facilitator should…',
    options: ['Teach the participant the correct path', 'Observe quietly and avoid leading the participant', 'Skip note-taking to save time', 'Defend the design when criticized'],
    correctIndex: 1,
    explanation: 'Leading the participant invalidates the test — the point is to observe natural behavior.',
  },
  {
    id: 'quiz-ux-6', courseId: 'c-ux-research',
    question: 'Affinity diagramming is a technique used to…',
    options: ['Group qualitative findings into themes', 'Recruit participants faster', 'Edit design prototypes', 'Book interview rooms'],
    correctIndex: 0,
    explanation: 'Affinity diagramming clusters notes and observations into themes so patterns become visible.',
  },
];
