import type { Lesson, Opts, Step } from './types'
import OcrCanvas from '../canvases/OcrCanvas'
import type { OcrMode } from '../data/ocr'
import { FIXES, OCR_DUR, RECEIPT, truth } from '../data/ocr'
import { C } from '../lib/draw'

const CLASSIC_CODE = String.raw`
import pytesseract
from PIL import Image, ImageOps
from pydantic import BaseModel
from langchain.chat_models import init_chat_model

image = Image.open("receipt.jpg")
gray = ImageOps.grayscale(image)
angle = detect_skew(gray)
straight = gray.rotate(angle, expand=True, fillcolor=255)
clean = straight.point(lambda p: 255 if p > 150 else 0)

boxes = pytesseract.image_to_data(clean, output_type=pytesseract.Output.DICT)
raw_text = pytesseract.image_to_string(clean)

class LineItem(BaseModel):
    name: str
    price: float

class Receipt(BaseModel):
    merchant: str
    date: str
    items: list[LineItem]
    total: float

model = init_chat_model("openai:gpt-5")
receipt = model.with_structured_output(Receipt).invoke(
    f"This text comes from OCR and may contain mistakes. Fix them and extract the fields:\n{raw_text}"
)
`

const VLM_CODE = String.raw`
import base64
from pydantic import BaseModel
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage

class LineItem(BaseModel):
    name: str
    price: float

class Receipt(BaseModel):
    merchant: str
    date: str
    items: list[LineItem]
    total: float

with open("receipt.jpg", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

model = init_chat_model("openai:gpt-5")
reader = model.with_structured_output(Receipt)

receipt = reader.invoke([HumanMessage(content=[
    {"type": "text", "text": "Read this receipt and extract the fields."},
    {"type": "image", "base64": image_b64, "mime_type": "image/jpeg"},
])])

assert abs(sum(i.price for i in receipt.items) - receipt.total) < 0.01
`

const RECEIPT_OBJ = {
  merchant: 'Corner Cafe',
  date: '2026-03-12',
  items: RECEIPT.filter((l) => l.price && l.name !== 'TOTAL').map((l) => ({ name: l.name, price: Number(l.price) })),
  total: 45.9,
}

const SCAN_STATE = { file: 'receipt.jpg', size: '1200 × 2400 px', issues: ['tilted about 4°', 'paper noise', 'low contrast'] }

function build(o: Opts) {
  const mode: OcrMode = o.mode === 'vlm' ? 'vlm' : 'classic'
  const classic: Omit<Step, 'dur'>[] = [
    {
      title: 'A scanned document',
      detail: 'A phone photo of a receipt: tilted, noisy, low contrast. To a computer it is just pixels, with no text yet.',
      color: C.amber,
      focus: ['image = Image.open'],
      state: SCAN_STATE,
    },
    {
      title: 'Preprocess the image',
      detail: 'Classic OCR is sensitive to image quality, so the scan is converted to grayscale, straightened and turned into clean black and white.',
      color: C.green,
      focus: ['gray = ImageOps.grayscale', 'angle = detect_skew', 'straight = gray.rotate', 'clean = straight.point'],
      state: { preprocess: ['grayscale', 'deskew -4°', 'binarize, threshold 150'] },
    },
    {
      title: 'Detect text regions',
      detail: 'The OCR engine finds where text is and draws a box around each line or word before reading anything.',
      color: C.cyan,
      focus: ['boxes = pytesseract.image_to_data'],
      state: { regions: RECEIPT.length, first_boxes: [{ text_region: [96, 210, 410, 48] }, { text_region: [80, 290, 440, 36] }] },
    },
    {
      title: 'Recognize characters',
      detail: 'Each box is read character by character with a confidence score. Look-alike characters cause typical errors: O vs 0, 5 vs S.',
      color: C.amber,
      focus: ['boxes = pytesseract.image_to_data', 'output_type=pytesseract.Output.DICT'],
      state: { words: RECEIPT.map((l) => ({ text: l.ocr, conf: l.conf })), low_confidence: RECEIPT.filter((l) => l.conf < 0.8).map((l) => l.ocr) },
    },
    {
      title: 'Raw text, with mistakes',
      detail: 'The output is plain text: some characters are wrong, columns are lost and there is no structure. You cannot use it directly.',
      color: C.red,
      focus: ['raw_text = pytesseract.image_to_string'],
      state: { raw_text: RECEIPT.map((l) => l.ocr), errors: RECEIPT.filter((l) => l.ocr !== truth(l)).length, problems: ['O read as 0', '5 read as S', 'columns lost'] },
    },
    {
      title: 'LLM fixes and structures it',
      detail: 'An LLM gets the raw text, fixes OCR mistakes from context (the items add up to 45.90, so 4S.90 must be 45.90) and returns typed JSON.',
      color: C.violet,
      focus: ['class Receipt', 'model.with_structured_output(Receipt)', 'This text comes from OCR'],
      state: { receipt: RECEIPT_OBJ, fixed: FIXES },
    },
  ]
  const vlm: Omit<Step, 'dur'>[] = [
    {
      title: 'A scanned document',
      detail: 'The same tilted, noisy receipt photo, but this time no preprocessing or OCR engine is involved.',
      color: C.amber,
      focus: ['with open("receipt.jpg"'],
      state: SCAN_STATE,
    },
    {
      title: 'The vision LLM reads the image',
      detail: 'The image is split into patches and read by gpt-5 directly. It sees layout and text together, so tilt and noise matter much less.',
      color: C.cyan,
      focus: ['image_b64 = base64', '{"type": "image"', 'receipt = reader.invoke'],
      state: { model: 'openai:gpt-5', content: [{ type: 'text', text: 'Read this receipt and extract the fields.' }, { type: 'image', mime_type: 'image/jpeg', base64: '/9j/4AAQSkZJRg… (truncated)' }] },
    },
    {
      title: 'Structured JSON in one call',
      detail: 'with_structured_output returns a typed Receipt. Reading and structuring happen in the same step, with no OCR typos to clean up.',
      color: C.green,
      focus: ['class Receipt', 'reader = model.with_structured_output(Receipt)'],
      state: { receipt: RECEIPT_OBJ },
    },
    {
      title: 'Validate with a business rule',
      detail: 'Vision models can still misread, or invent a value when text is unreadable. A cheap check, like items summing to the total, catches it.',
      color: C.green,
      focus: ['assert abs(sum('],
      state: { check: 'sum(items) == total', sum_of_items: 45.9, total: 45.9, valid: true },
    },
  ]
  const raw = mode === 'classic' ? classic : vlm
  const steps: Step[] = raw.map((s) => ({ ...s, dur: OCR_DUR }))
  return { steps, file: mode === 'classic' ? 'ocr_pipeline.py' : 'vision_ocr.py', code: mode === 'classic' ? CLASSIC_CODE : VLM_CODE }
}

export const ocr: Lesson = {
  id: 'ocr',
  num: '14',
  nav: 'OCR',
  group: 'Foundations',
  title: 'OCR: from scans to data',
  lead: 'Turn images of documents into text and structured data, with a classic OCR pipeline or a vision LLM.',
  blurb: 'Preprocess, detect, recognize, structure.',
  options: [
    {
      key: 'mode',
      label: 'Approach',
      type: 'segmented',
      choices: [
        { value: 'classic', label: 'Classic OCR + LLM' },
        { value: 'vlm', label: 'Vision LLM' },
      ],
    },
  ],
  defaults: { mode: 'classic' },
  ideas: [
    { title: 'OCR turns pixels into text', body: 'Classic engines like Tesseract find text regions and recognise characters, but they return plain text with no meaning.', color: C.cyan },
    { title: 'Garbage in, garbage out', body: 'Tilt, blur and noise hurt classic OCR badly. Preprocessing (grayscale, deskew, binarize) often matters more than the engine.', color: C.amber },
    { title: 'LLMs fix and structure', body: 'An LLM can correct typical OCR errors from context and map the text to a schema, combining cheap OCR with smart cleanup.', color: C.violet },
    { title: 'Vision LLMs read directly', body: 'They handle layout, handwriting and messy scans well in one call, at a higher cost per page. Classic OCR is cheaper at scale.', color: C.green },
    { title: 'Always verify', body: 'Use confidence scores, totals and cross-field checks. Send low-confidence documents to a human.', color: C.red },
  ],
  build,
  Canvas: OcrCanvas,
}
