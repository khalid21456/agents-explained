export type OcrMode = 'classic' | 'vlm'

export interface ReceiptLine {
  name: string
  price: string
  ocr: string
  conf: number
  header?: boolean
}

export const RECEIPT: ReceiptLine[] = [
  { name: 'CORNER CAFE', price: '', ocr: 'C0RNER CAFE', conf: 0.81, header: true },
  { name: '12/03/2026  09:41', price: '', ocr: '12/03/2026  09:41', conf: 0.96, header: true },
  { name: 'Cappuccino', price: '4.50', ocr: 'Cappuccino 4.50', conf: 0.97 },
  { name: 'Croissant', price: '3.20', ocr: 'Croissant 3.2O', conf: 0.74 },
  { name: 'Club sandwich', price: '11.90', ocr: 'Club sandwich 11.90', conf: 0.95 },
  { name: 'Orange juice', price: '5.30', ocr: '0range juice 5.30', conf: 0.78 },
  { name: 'Lunch menu', price: '21.00', ocr: 'Lunch menu 21.00', conf: 0.94 },
  { name: 'TOTAL', price: '45.90', ocr: 'T0TAL 4S.90', conf: 0.62 },
]

export function truth(l: ReceiptLine) {
  return l.price ? `${l.name} ${l.price}` : l.name
}

export const FIXES = ['zero instead of O: C0RNER → CORNER', 'O instead of zero: 3.2O → 3.20', 'zero instead of O: 0range → Orange', 'S instead of 5: 4S.90 → 45.90 (items add up)']

export const RECEIPT_JSON_LINES = [
  '{',
  '  "merchant": "Corner Cafe",',
  '  "date": "2026-03-12",',
  '  "items": [',
  '    { "name": "Cappuccino", "price": 4.50 },',
  '    { "name": "Croissant", "price": 3.20 },',
  '    { "name": "Club sandwich", "price": 11.90 },',
  '    { "name": "Orange juice", "price": 5.30 },',
  '    { "name": "Lunch menu", "price": 21.00 }',
  '  ],',
  '  "total": 45.90',
  '}',
]

export const STAGES: Record<OcrMode, string[]> = {
  classic: ['Scan', 'Preprocess', 'Detect', 'Recognize', 'Raw text', 'LLM fix'],
  vlm: ['Scan', 'Vision LLM reads', 'Structured JSON', 'Validate'],
}

export const OCR_DUR = 3.2
