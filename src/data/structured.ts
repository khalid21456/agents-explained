export type SoScenario = 'valid' | 'retry'
export type SoPhase = 'free' | 'schema' | 'jsonschema' | 'generate' | 'validate-ok' | 'validate-fail' | 'retry' | 'use'

export const INVOICE_LINES = [
  'ACME CORP',
  'Invoice #4471',
  'Date: 3 March 2026',
  '2 × Ergonomic chair   $980.00',
  '1 × Desk lamp         $260.00',
  'Total due:          $1,240.00',
]

export const FREE_TEXT = 'The invoice is from Acme Corp, dated March 3rd. It covers two chairs and a desk lamp, for a total of around $1,240.'

export const PYDANTIC_LINES = [
  { text: 'class Invoice(BaseModel):', field: '' },
  { text: '  vendor: str', field: 'vendor' },
  { text: '  invoice_date: date', field: 'invoice_date' },
  { text: '  currency: Literal["USD", "EUR", "GBP"]', field: 'currency' },
  { text: '  total: float', field: 'total' },
  { text: '  items: list[LineItem]', field: 'items' },
]

export const JSON_SCHEMA_LINES = [
  '{ "title": "Invoice", "type": "object",',
  '  "properties": {',
  '    "vendor": { "type": "string" },',
  '    "invoice_date": { "type": "string", "format": "date" },',
  '    "currency": { "enum": ["USD", "EUR", "GBP"] },',
  '    "total": { "type": "number" },',
  '    "items": { "type": "array", "items": { "$ref": "LineItem" } } },',
  '  "required": ["vendor", "invoice_date", "currency", "total", "items"] }',
]

export interface FieldOut {
  key: string
  value: string
  ok: boolean
  parsed: string
  error?: string
}

export const GOOD_FIELDS: FieldOut[] = [
  { key: 'vendor', value: '"Acme Corp"', ok: true, parsed: 'str' },
  { key: 'invoice_date', value: '"2026-03-03"', ok: true, parsed: 'date(2026, 3, 3)' },
  { key: 'currency', value: '"USD"', ok: true, parsed: 'Literal' },
  { key: 'total', value: '1240.0', ok: true, parsed: 'float' },
  { key: 'items', value: '[ 2 line items ]', ok: true, parsed: 'list[LineItem]' },
]

export const BAD_FIELDS: FieldOut[] = [
  { key: 'vendor', value: '"Acme Corp"', ok: true, parsed: 'str' },
  { key: 'invoice_date', value: '"2026-03-03"', ok: true, parsed: 'date(2026, 3, 3)' },
  { key: 'currency', value: '"dollars"', ok: false, parsed: '', error: "Input should be 'USD', 'EUR' or 'GBP'" },
  { key: 'total', value: '"1,240.00"', ok: false, parsed: '', error: 'Input should be a valid number' },
  { key: 'items', value: '[ 2 line items ]', ok: true, parsed: 'list[LineItem]' },
]

export interface SoStep {
  phase: SoPhase
  fields?: FieldOut[]
}

export const SO_FLOWS: Record<SoScenario, SoStep[]> = {
  valid: [
    { phase: 'free' },
    { phase: 'schema' },
    { phase: 'jsonschema' },
    { phase: 'generate', fields: GOOD_FIELDS },
    { phase: 'validate-ok', fields: GOOD_FIELDS },
    { phase: 'use', fields: GOOD_FIELDS },
  ],
  retry: [
    { phase: 'free' },
    { phase: 'schema' },
    { phase: 'jsonschema' },
    { phase: 'generate', fields: BAD_FIELDS },
    { phase: 'validate-fail', fields: BAD_FIELDS },
    { phase: 'retry', fields: GOOD_FIELDS },
    { phase: 'validate-ok', fields: GOOD_FIELDS },
    { phase: 'use', fields: GOOD_FIELDS },
  ],
}

export const SO_DUR = 3.2
