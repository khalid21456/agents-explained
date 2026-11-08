import type { Lesson, Opts, Step } from './types'
import EvalCanvas from '../canvases/EvalCanvas'
import type { Experiment } from '../data/evaluation'
import { DATASET, EVAL_DURS, METRICS, RUNS, checks, fmtMetric, scores } from '../data/evaluation'
import { C } from '../lib/draw'

function code(e: Experiment) {
  return String.raw`
from langsmith import Client
from openevals.llm import create_llm_as_judge

client = Client()

dataset = client.create_dataset("support-triage")
client.create_examples(
    dataset_id=dataset.id,
    examples=[
        {"inputs": {"ticket": "My order #4512 arrived broken!!"}, "outputs": {"category": "product", "urgency": "high"}},
        {"inputs": {"ticket": "Where is my parcel? 3 days late."}, "outputs": {"category": "shipping", "urgency": "medium"}},
        {"inputs": {"ticket": "I was charged twice."}, "outputs": {"category": "billing", "urgency": "high"}},
    ],
)

def target(inputs: dict) -> dict:
    return triage.invoke({"ticket": inputs["ticket"]}).model_dump()

def correct_category(outputs: dict, reference_outputs: dict) -> bool:
    return outputs["category"] == reference_outputs["category"]

def correct_urgency(outputs: dict, reference_outputs: dict) -> bool:
    return outputs["urgency"] == reference_outputs["urgency"]

judge = create_llm_as_judge(
    prompt="Is the suggested next action helpful and safe for this ticket?\n{inputs}\n{outputs}",
    model="openai:gpt-5",
    feedback_key="helpful_action",
    continuous=True,
)

def helpful_action(inputs: dict, outputs: dict) -> dict:
    return judge(inputs=inputs, outputs=outputs)

results = client.evaluate(
    target,
    data="support-triage",
    evaluators=[correct_category, correct_urgency, helpful_action],
    experiment_prefix="${RUNS[e].prefix}",
)

scores = results.to_pandas()
assert scores["feedback.correct_category"].mean() >= 0.9
assert scores["feedback.correct_urgency"].mean() >= 0.8
assert scores["feedback.helpful_action"].mean() >= 0.8
`
}

function build(o: Opts) {
  const e: Experiment = o.experiment === 'v1' ? 'v1' : 'v2'
  const run = RUNS[e]
  const res = checks(e)
  const sc = scores(e)
  const fmtScores = (x: ReturnType<typeof scores>) => Object.fromEntries(METRICS.map((m) => [m.key, fmtMetric(m, x[m.key])]))
  const pass = METRICS.every((m) => sc[m.key] >= m.threshold)

  const raw: Omit<Step, 'dur'>[] = [
    {
      title: 'Build a dataset',
      detail: 'Collect realistic inputs with the answers you expect. Real user tickets and past failures make the best examples.',
      color: C.blue,
      focus: ['client = Client()', 'dataset = client.create_dataset', 'client.create_examples(', '{"inputs": {"ticket"'],
      state: {
        dataset: 'support-triage',
        size: DATASET.length,
        examples: [
          ...DATASET.slice(0, 2).map((d) => ({ inputs: { ticket: d.ticket }, outputs: { category: d.category, urgency: d.urgency } })),
          `… ${DATASET.length - 2} more`,
        ],
      },
    },
    {
      title: 'Run the app on every example',
      detail: `client.evaluate calls the target (the triage chain, ${run.label}) once per example and records every output.`,
      color: C.violet,
      focus: ['def target', 'return triage.invoke', 'results = client.evaluate(', 'experiment_prefix='],
      state: { experiment: run.prefix, runs: DATASET.length, outputs: run.outputs.map((x) => `${x.category} · ${x.urgency}`) },
    },
    {
      title: 'Code evaluators',
      detail: 'Deterministic checks compare each output to the reference. They are fast, free and perfectly repeatable.',
      color: C.cyan,
      focus: ['def correct_category', 'return outputs["category"]', 'def correct_urgency', 'return outputs["urgency"]'],
      state: { experiment: run.prefix, correct_category: res.map((r) => r.category), correct_urgency: res.map((r) => r.urgency) },
    },
    {
      title: 'LLM-as-judge',
      detail: 'Some qualities have no exact answer, like whether the suggested action is helpful. A second model grades them from 0 to 1.',
      color: C.amber,
      focus: ['judge = create_llm_as_judge(', 'prompt="Is the suggested', 'model="openai:gpt-5"', 'feedback_key="helpful_action"', 'def helpful_action', 'return judge('],
      state: { evaluator: 'llm_as_judge (openai:gpt-5)', helpful_action: res.map((r) => r.judge) },
    },
    {
      title: 'Aggregate scores',
      detail: 'Per-example results roll up into one score per metric, which you can compare against thresholds.',
      color: pass ? C.green : C.red,
      focus: ['evaluators=[correct_category', 'scores = results.to_pandas()'],
      state: { experiment: run.prefix, scores: fmtScores(sc) },
    },
    {
      title: 'Compare experiments',
      detail: 'v2 wins on category and judge score. Urgency looks unchanged at 83%, but v2 fixed ticket 2 and broke ticket 5. Always read the examples, not just the averages.',
      color: C.cyan,
      focus: ['experiment_prefix='],
      state: {
        compare: { 'triage-prompt-v1': fmtScores(scores('v1')), 'triage-prompt-v2': fmtScores(scores('v2')) },
        regressions: [{ example: 5, metric: 'correct_urgency', v1: true, v2: false }],
        fixes: [{ example: 2, metric: 'correct_urgency', v1: false, v2: true }],
      },
    },
    {
      title: pass ? 'Gate: pass, ship it' : 'Gate: blocked',
      detail: pass
        ? 'Run the evaluation in CI on every prompt or model change. All thresholds are met, so this version can ship.'
        : 'Run the evaluation in CI on every prompt or model change. v1 misses the category and judge thresholds, so the release is blocked.',
      color: pass ? C.green : C.red,
      focus: ['assert scores'],
      state: {
        experiment: run.prefix,
        thresholds: Object.fromEntries(METRICS.map((m) => [m.key, `>= ${fmtMetric(m, m.threshold)}`])),
        scores: fmtScores(sc),
        result: pass ? 'pass' : 'fail',
      },
    },
  ]
  const steps: Step[] = raw.map((s, i) => ({ ...s, dur: EVAL_DURS[i] }))
  return { steps, file: 'evaluate.py', code: code(e) }
}

export const evaluation: Lesson = {
  id: 'evaluation',
  num: '12',
  nav: 'Evaluation',
  group: 'Foundations',
  title: 'Evaluation',
  lead: 'Measure your agent on a fixed dataset with code checks and an LLM judge, compare versions, and gate releases on the scores.',
  blurb: 'Datasets, evaluators, LLM judge, CI gates.',
  options: [
    {
      key: 'experiment',
      label: 'Experiment',
      type: 'segmented',
      choices: [
        { value: 'v2', label: 'v2 · few-shot + schema' },
        { value: 'v1', label: 'v1 · bare prompt' },
      ],
    },
  ],
  defaults: { experiment: 'v2' },
  ideas: [
    { title: 'No eval, no progress', body: 'Without a fixed test set, every prompt tweak is a guess. A dataset turns "seems better" into a number.', color: C.cyan },
    { title: 'Code checks first', body: 'Exact matches, schemas and regexes are cheap and repeatable. Save LLM judges for qualities code cannot measure.', color: C.green },
    { title: 'Judge the judge', body: 'LLM judges can be biased. Give them a clear rubric and spot-check their scores against human labels.', color: C.amber },
    { title: 'Read the examples', body: 'Averages hide regressions. Compare experiments example by example to see what got fixed and what broke.', color: C.violet },
    { title: 'Evaluate continuously', body: 'Run evals in CI on every change, and add production failures to the dataset so they never come back.', color: C.pink },
  ],
  build,
  Canvas: EvalCanvas,
}
