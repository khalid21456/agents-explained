import type { Lesson, Opts, Step } from './types'
import StructuredCanvas from '../canvases/StructuredCanvas'
import type { SoScenario, SoStep } from '../data/structured'
import { FREE_TEXT, SO_DUR, SO_FLOWS } from '../data/structured'
import { C } from '../lib/draw'

const HEAD = String.raw`
import json
from datetime import date
from typing import Literal
from pydantic import BaseModel, Field
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-5")

raw = model.invoke(f"Extract the invoice details:\n{invoice_text}")
data = json.loads(raw.content)

class LineItem(BaseModel):
    description: str
    amount: float

class Invoice(BaseModel):
    vendor: str
    invoice_date: date
    currency: Literal["USD", "EUR", "GBP"]
    total: float = Field(description="Total amount due, as a number")
    items: list[LineItem]
`

const VALID_TAIL = String.raw`
extractor = model.with_structured_output(Invoice)
invoice = extractor.invoke(f"Extract the invoice details:\n{invoice_text}")

print(invoice.vendor, invoice.total)
if invoice.total > 1000:
    request_approval(invoice)
`

const RETRY_TAIL = String.raw`
extractor = model.with_structured_output(Invoice, include_raw=True)
prompt = [("user", f"Extract the invoice details:\n{invoice_text}")]
result = extractor.invoke(prompt)

if result["parsing_error"]:
    prompt.append(("user", f"Your answer was invalid: {result['parsing_error']}. Try again."))
    result = extractor.invoke(prompt)

invoice = result["parsed"]

print(invoice.vendor, invoice.total)
if invoice.total > 1000:
    request_approval(invoice)
`

const FIELDS_STATE = { vendor: 'Acme Corp', invoice_date: '2026-03-03', currency: 'USD', total: 1240.0, items: [{ description: 'Ergonomic chair', amount: 980.0 }, { description: 'Desk lamp', amount: 260.0 }] }
const BAD_STATE = { ...FIELDS_STATE, currency: 'dollars', total: '1,240.00' }
const ERRORS = [
  { loc: ['currency'], msg: "Input should be 'USD', 'EUR' or 'GBP'", input: 'dollars' },
  { loc: ['total'], msg: 'Input should be a valid number, unable to parse string as a number', input: '1,240.00' },
]

function describe(s: SoStep, sc: SoScenario, retried: boolean): Omit<Step, 'dur'> {
  switch (s.phase) {
    case 'free':
      return {
        title: 'Free text is hard to use',
        detail: 'Asked to "extract the details", the model answers in friendly prose. Your code cannot use it: json.loads crashes and regexes break on the next phrasing.',
        color: C.red,
        focus: ['raw = model.invoke', 'data = json.loads'],
        state: { output_type: 'str', raw: FREE_TEXT, 'json.loads': 'JSONDecodeError: Expecting value: line 1 column 1' },
      }
    case 'schema':
      return {
        title: 'Define a schema',
        detail: 'Describe exactly the shape you need as a Pydantic model: field names, types, allowed values and descriptions.',
        color: C.amber,
        focus: ['class LineItem', 'class Invoice', 'vendor: str', 'invoice_date: date', 'currency: Literal', 'total: float', 'items: list[LineItem]'],
        state: { schema: { vendor: 'str', invoice_date: 'date', currency: 'Literal["USD", "EUR", "GBP"]', total: 'float', items: 'list[LineItem]' } },
      }
    case 'jsonschema':
      return {
        title: 'Schema sent to the model',
        detail: 'with_structured_output converts the Pydantic class to JSON Schema and sends it with the request, through the provider\'s native structured output or tool calling.',
        color: C.amber,
        focus: ['extractor = model.with_structured_output'],
        state: {
          json_schema: {
            title: 'Invoice',
            type: 'object',
            properties: { vendor: { type: 'string' }, invoice_date: { type: 'string', format: 'date' }, currency: { enum: ['USD', 'EUR', 'GBP'] }, total: { type: 'number' }, items: { type: 'array' } },
            required: ['vendor', 'invoice_date', 'currency', 'total', 'items'],
          },
        },
      }
    case 'generate':
      return {
        title: 'Constrained generation',
        detail:
          sc === 'retry'
            ? 'The model fills the fields in order. Without strict mode it can still break your rules: "dollars" is not an allowed currency and "1,240.00" is a string, not a number.'
            : 'The model fills the fields in order, guided by the schema, producing JSON instead of prose.',
        color: C.violet,
        focus: sc === 'retry' ? ['result = extractor.invoke(prompt)'] : ['invoice = extractor.invoke'],
        state: { generated: sc === 'retry' ? BAD_STATE : FIELDS_STATE },
      }
    case 'validate-fail':
      return {
        title: 'Validation fails',
        detail: 'Pydantic checks every field against the schema and reports exactly what is wrong, instead of letting bad data flow into your system.',
        color: C.red,
        focus: ['if result["parsing_error"]'],
        state: { validation: 'failed', errors: ERRORS },
      }
    case 'retry':
      return {
        title: 'Retry with the errors',
        detail: 'The error messages go back to the model as feedback. It sees what to fix and answers again: "USD" and 1240.0.',
        color: C.amber,
        focus: ['prompt.append(', '    result = extractor.invoke(prompt)'],
        state: { retry: 1, feedback: ERRORS.map((e) => `${e.loc[0]}: ${e.msg}`), generated: FIELDS_STATE },
      }
    case 'validate-ok':
      return {
        title: retried ? 'Validation passes' : 'Validate and parse',
        detail: 'Every field matches the schema. Strings are parsed into real types: "2026-03-03" becomes a date, 1240.0 a float.',
        color: C.green,
        focus: sc === 'retry' ? ['invoice = result["parsed"]'] : ['invoice = extractor.invoke', 'class Invoice'],
        state: { validation: 'passed', parsed: { vendor: 'str', invoice_date: 'datetime.date(2026, 3, 3)', currency: "'USD'", total: 1240.0, items: '2 × LineItem' } },
      }
    case 'use':
      return {
        title: 'A typed object in your code',
        detail: 'You get an Invoice instance, not text. Use it with dot access, your editor\'s autocomplete and normal if statements.',
        color: C.pink,
        focus: ['print(invoice.vendor', 'if invoice.total > 1000', 'request_approval(invoice)'],
        state: { type: 'Invoice', 'invoice.vendor': 'Acme Corp', 'invoice.total': 1240.0, 'invoice.invoice_date': 'datetime.date(2026, 3, 3)', approval_required: true },
      }
  }
}

function build(o: Opts) {
  const sc: SoScenario = o.scenario === 'retry' ? 'retry' : 'valid'
  const flow = SO_FLOWS[sc]
  const steps: Step[] = flow.map((s, i) => ({ ...describe(s, sc, flow.slice(0, i).some((x) => x.phase === 'retry')), dur: SO_DUR }))
  return { steps, file: 'structured_output.py', code: HEAD + (sc === 'retry' ? RETRY_TAIL : VALID_TAIL) }
}

export const structured: Lesson = {
  id: 'structured-output',
  num: '03',
  nav: 'Structured output',
  group: 'Foundations',
  title: 'Structured output',
  lead: 'Make the model return data your code can trust: define a schema, get validated JSON back, and retry when it is wrong.',
  blurb: 'Schemas, JSON, validation, retries.',
  options: [
    {
      key: 'scenario',
      label: 'Validation',
      type: 'segmented',
      choices: [
        { value: 'valid', label: 'Valid first try' },
        { value: 'retry', label: 'Fails, then retry' },
      ],
    },
  ],
  defaults: { scenario: 'valid' },
  ideas: [
    { title: 'Text is for humans, data is for code', body: 'Whenever another program consumes the answer, ask for structured output instead of parsing prose.', color: C.cyan },
    { title: 'The schema is part of the prompt', body: 'Field names, types, enums and descriptions all guide the model. Name fields clearly and describe the tricky ones.', color: C.amber },
    { title: 'Validate everything', body: 'Even with a schema, check the result. Pydantic turns bad output into precise errors instead of silent bugs.', color: C.green },
    { title: 'Retry with feedback', body: 'Sending the validation errors back usually fixes the answer in one more call. Cap the retries.', color: C.violet },
    { title: 'Strict mode when available', body: 'Providers with native strict structured outputs guarantee the JSON matches your schema; you still validate the meaning.', color: C.pink },
  ],
  build,
  Canvas: StructuredCanvas,
}
