# ReviewX

**ReviewX** is a secure SaaS-based code review platform that automatically analyzes source code for security vulnerabilities, bugs, code-quality issues, and performance problems.

It combines static code analysis, company rules, AI assistance, scoring, and report generation to help developers understand and improve their code.

---

## Features

- Source-code review through pasted code or file upload
- Automatic programming-language detection
- Source-code parsing
- Security vulnerability detection
- Bug detection
- Code-quality analysis
- Performance analysis
- Company-specific coding rules
- Finding normalization and deduplication
- Evidence collection
- AI-powered explanations and fix suggestions
- Code-review scoring
- JSON reports
- PDF reports
- Cloudinary storage for generated reports
- MongoDB persistence
- Secure file handling
- Source code is never executed

---

## V1 Analysis

### Security

- SQL Injection
- Broken Access Control
- Authentication Problems

### Bugs

- Null / Undefined Problems
- Logic Errors

### Code Quality

- Code Complexity
- Unused Code

### Performance

- N+1 Database Queries

The architecture is designed so additional analyzers can be added in future versions without changing the core review engine.

---

## How ReviewX Works

ReviewX processes source code through the following pipeline:

```text
Source Code
     ↓
Validation & Access Control
     ↓
Input Processing
     ↓
Language Detection
     ↓
Parsing
     ↓
Static Analysis
     ↓
Company Rules
     ↓
Finding Normalization
     ↓
Merge & Deduplication
     ↓
Evidence Collection
     ↓
AI Analysis
     ↓
Scoring
     ↓
Result Builder
     ↓
JSON / PDF Report
     ↓
MongoDB / Cloudinary
```

Deterministic analyzers identify technical findings first. AI is then used to explain findings, suggest fixes, improve code, and generate summaries.

---

## Technology Stack

### Backend

- Node.js
- Express.js
- JavaScript ES Modules

### Database

- MongoDB
- Mongoose

### Validation & Security

- Joi
- Multer
- Secure file validation
- Input validation
- Rate limiting
- Security middleware

### AI

- Groq
- OpenAI-compatible provider architecture

### Storage

- Cloudinary

### Reports

- JSON
- PDF

### HTTP

- Axios or equivalent HTTP client

---

## Architecture

ReviewX follows a modular and layered backend architecture:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Review Engine
  ↓
Analyzers / Parsers / AI
  ↓
Repositories
  ↓
MongoDB
```

### Main Components

#### Controllers

- Handle HTTP requests and responses
- Do not contain analysis logic
- Do not directly access MongoDB

#### Services

- Handle application-level operations
- Coordinate different components

#### Analyzers

- Perform static source-code analysis
- Detect security, bug, quality, and performance issues
- Never execute uploaded source code

#### Review Engine

- Controls the complete review pipeline
- Coordinates analyzers, rules, evidence, AI, and scoring

#### Repositories

- Handle MongoDB operations only
- Keep database logic separate from application logic

#### AI

- Explains detected findings
- Provides fix and improvement suggestions
- Generates review summaries

#### Reports

- Generate JSON and PDF reports

---

## Project Structure

```text
ReviewX/
├── src/
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── validators/
│   ├── middleware/
│   ├── database/
│   ├── storage/
│   ├── engine/
│   ├── analysis/
│   ├── analyzers/
│   ├── parsers/
│   ├── company-rules/
│   ├── ai/
│   ├── reports/
│   ├── schemas/
│   ├── utils/
│   └── tests/
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Directory Overview

| Directory | Purpose |
|---|---|
| `config/` | Application and service configuration |
| `routes/` | API endpoints |
| `controllers/` | HTTP request handling |
| `services/` | Application logic |
| `validators/` | Request validation |
| `middleware/` | Express middleware |
| `database/` | MongoDB models and repositories |
| `storage/` | Cloudinary integration |
| `engine/` | Main review pipeline |
| `analysis/` | Finding processing |
| `analyzers/` | Security, bug, quality, and performance analysis |
| `parsers/` | Source-code parsing |
| `company-rules/` | Company-specific rules |
| `ai/` | AI providers and analysis |
| `reports/` | JSON and PDF reports |
| `schemas/` | Data structures and validation |
| `utils/` | Shared utilities |
| `tests/` | Unit and integration tests |

---

## Security Principles

Security is a core part of ReviewX.

- Uploaded source code is never executed
- File extensions and MIME types are validated
- File sizes are restricted
- Empty and invalid files are rejected
- Path traversal is prevented
- Temporary files are cleaned after processing
- Source code is not uploaded to Cloudinary by default
- AI input is limited to relevant analysis data
- Database access is isolated inside repositories
- Controllers cannot directly access MongoDB
- AI failures do not stop deterministic analysis

---

## Data Storage

ReviewX stores meaningful review results instead of every temporary analysis operation.

### Main MongoDB Collections

```text
reviews
findings
evidence
scores
aiAnalyses
reports
```

Temporary analysis data is kept during the review process and is not unnecessarily persisted.

---

## Access & Premium Integration

User accounts, companies, subscriptions, payments, and usage limits belong to the main application backend.

The ReviewX analysis backend receives generic access information such as:

```text
plan
limits
features
```

The analysis engine remains independent from subscription and payment logic.

---

## Reports

A completed ReviewX analysis can produce:

- Structured JSON results
- PDF reports
- Security findings
- Bug findings
- Quality findings
- Performance findings
- Evidence
- Recommendations
- AI explanations
- Review scoring

Generated PDF reports can be stored using Cloudinary.

---

## Development Status

### V1

- Backend architecture
- Input processing
- Language detection
- Parsing
- Security analysis
- Bug analysis
- Quality analysis
- Performance analysis
- Company rules
- AI analysis
- Scoring
- JSON reports
- PDF reports
- Cloudinary integration
- Testing
- Final security review

---

## Future Improvements

ReviewX can be extended with additional analyzers such as:

- XSS
- CSRF
- SSRF
- Command Injection
- Path Traversal
- Open Redirect
- Secrets Detection
- JWT Security
- CORS Security
- File Upload Security
- Code Duplication
- Maintainability
- Readability
- API Performance
- Memory Analysis
- Framework-specific analysis

---

## Core Principle

> Detect problems with deterministic analysis, provide real evidence, and use AI to explain and improve the results.

ReviewX is designed with a modular architecture so new languages, analyzers, rules, AI providers, and report formats can be added without redesigning the entire platform.
