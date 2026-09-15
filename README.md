# AI Report Analyzer

Upload a PDF/image report → OCR extracts text and tables → backend converts
it into structured data → AI generates a summary/findings → multiple
reports can be compared → RAG enables report-based Q&A → dashboard displays
everything.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + Tailwind + Recharts |
| API | FastAPI |
| OCR | PaddleOCR (native PDF text layer used when available, OCR only for scans) |
| PDF/Image | PyMuPDF + OpenCV |
| AI | Any OpenRouter model (multi-model switching; summary/findings + grounded chat) |
| RAG | Sentence Transformers + FAISS |
| Database | PostgreSQL (Docker) / SQLite (local dev) |
| Deployment | Docker Compose |

## Project layout

```
report-analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, router registration
│   │   ├── config.py          # env-driven settings
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # ORM models
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── reports.py     # upload, status, data, ocr, tables
│   │   │   ├── analysis.py    # AI analysis + multi-report compare
│   │   │   ├── chat.py        # RAG chat
│   │   │   └── settings.py    # available OpenRouter models for the model switcher
│   │   └── services/
│   │       ├── preprocess.py       # validation, PyMuPDF, OpenCV
│   │       ├── ocr_service.py      # PaddleOCR wrapper
│   │       ├── extraction_service.py  # structured field extraction
│   │       ├── table_service.py    # table reconstruction
│   │       ├── llm_service.py      # OpenRouter summary/findings/chat (multi-model)
│   │       ├── rag_service.py      # chunking, embeddings, retrieval
│   │       └── pdf_service.py      # pipeline orchestration
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/     # Home, Processing, Dashboard, ReportDetails, Compare, Chat
│   │   ├── components/ # UploadBox, SummaryCard, Findings, DataTable, TrendChart
│   │   ├── api.js
│   │   └── App.jsx
│   ├── tests/
│   └── Dockerfile
└── docker-compose.yml
```

## Running locally (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env            # then set OPENROUTER_API_KEY (optional but recommended)
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000` (docs at `/docs`). SQLite is used
by default (`report_analyzer.db`), no separate database server needed.

> **Note on PaddleOCR/Sentence-Transformers:** these are heavy ML
> dependencies. If they aren't installed or fail to load, the app degrades
> gracefully — OCR blocks are simply skipped for scanned pages (native PDF
> text layers still work fully), and RAG chat falls back to keyword-based
> retrieval instead of semantic search. Install them for full functionality:
> `pip install paddleocr paddlepaddle sentence-transformers faiss-cpu`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Running with Docker Compose

```bash
cp .env.example .env    # set OPENROUTER_API_KEY and POSTGRES_PASSWORD
docker compose build
docker compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Postgres: localhost:5432

## Environment variables (backend/.env)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite (local) or Postgres (Docker) connection string |
| `OPENROUTER_API_KEY` | Enables AI summary/findings and grounded chat answers, routed through [OpenRouter](https://openrouter.ai/keys). Without it, the app uses a deterministic non-LLM fallback so the pipeline still works end-to-end. |
| `OPENROUTER_BASE_URL` | Defaults to `https://openrouter.ai/api/v1` (OpenAI-compatible) |
| `LLM_MODEL` | Default model slug, defaults to `anthropic/claude-sonnet-4.5`. Any [OpenRouter model](https://openrouter.ai/models) works. |
| `AVAILABLE_MODELS` | Comma-separated OpenRouter model slugs offered in the frontend's model switcher |
| `APP_URL` / `APP_TITLE` | Attribution headers OpenRouter uses for their public rankings (optional) |
| `UPLOAD_DIR` / `PROCESSED_DIR` | Storage paths, kept outside the public web root |
| `MAX_UPLOAD_MB` | Upload size limit |
| `FRONTEND_ORIGIN` | CORS allow-origin |
| `OCR_LANG` | PaddleOCR language code |

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/reports/upload` | Upload + process a report |
| GET | `/api/reports` | List reports |
| GET | `/api/reports/{id}` | Report details |
| GET | `/api/reports/{id}/status` | Processing status |
| GET | `/api/reports/{id}/data` | Structured fields + tables |
| GET | `/api/reports/{id}/ocr` | Raw OCR blocks |
| GET | `/api/reports/{id}/tables` | Extracted tables |
| POST | `/api/analysis/{id}` | (Re)generate AI analysis — optional `{"model": "..."}` body to override the default model |
| GET | `/api/analysis/{id}` | Latest AI analysis |
| POST | `/api/analysis/compare` | Compare 2+ reports — optional `model` field |
| POST | `/api/chat` | RAG-grounded Q&A — optional `model` field |
| GET | `/api/chat/{id}/history` | Chat history for a report |
| GET | `/api/settings/models` | Available OpenRouter models + current default, for the model switcher |

## Testing

```bash
# Backend
cd backend && pytest -q

# Frontend
cd frontend && npm test
```

Both suites were run during development and pass (10 backend tests, 5
frontend tests).

## Security & reliability notes

- Uploads are validated by content-type and size on the backend, stored
  under server-generated filenames outside the public web root.
- Raw OCR output and extracted values are preserved for auditability.
- The LLM is instructed never to invent values and to separate extracted
  facts from interpretation; responses are schema-validated before storage,
  with a safe deterministic fallback on any validation failure.
- This demo processes uploads synchronously inside the request for
  simplicity. For production, move processing to a background task/queue
  and have the frontend poll `/status` (the Processing page already
  supports this pattern).
- Use synthetic or properly de-identified data for any sensitive domain
  (e.g. medical reports) when testing.

## Evaluation metrics (Step 20 of the build guide)

The `pdf_service.run_pipeline` result includes `processing_ms` and OCR
confidence per report; extend `tests/` with labeled fixtures to measure
OCR CER/WER and extraction precision/recall/F1 against ground truth before
reporting any numbers — don't use sample/made-up figures as final results.
