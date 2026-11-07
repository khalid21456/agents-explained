export type LoopNode = 'user' | 'think' | 'act' | 'obs' | 'answer'

export interface LoopStep {
  node: LoopNode
  iter: number
  title: string
  text: string
}

export const LOOP_STEPS: LoopStep[] = [
  { node: 'user', iter: 0, title: 'User input', text: "What's the weather in Paris, in °F?" },
  { node: 'think', iter: 1, title: 'Reason', text: 'I need live weather data. I will call a tool.' },
  { node: 'act', iter: 1, title: 'Act', text: 'get_weather(city="Paris")' },
  { node: 'obs', iter: 1, title: 'Observe', text: '18°C, cloudy' },
  { node: 'think', iter: 2, title: 'Reason', text: 'That is Celsius. Convert to Fahrenheit.' },
  { node: 'act', iter: 2, title: 'Act', text: 'calculator("18 * 9/5 + 32")' },
  { node: 'obs', iter: 2, title: 'Observe', text: '64.4' },
  { node: 'think', iter: 3, title: 'Reason', text: 'I have everything I need. No more tools.' },
  { node: 'answer', iter: 3, title: 'Final answer', text: "It's about 64°F and cloudy in Paris." },
]

export const LOOP_TRAVEL = 1.0
export const LOOP_DUR = 2.8
