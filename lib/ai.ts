export type TaskType =
  | 'deep-qa'
  | 'research'
  | 'checkin-eval'
  | 'notes'
  | 'mcq'
  | 'summary'
  | 'board-answer'
  | 'soul-summary';

export async function routeAI(task: TaskType, prompt: string, systemPrompt: string) {
  void task;
  void prompt;
  void systemPrompt;
  throw new Error('routeAI is not implemented yet.');
}
