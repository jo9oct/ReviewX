# ReviewX — AI-Powered Code Review Platform

**Document Type:** Software Project Documentation
**Version:** 1.0
**Backend:** Express.js
**Frontend:** React
**Database:** MongoDB with Mongoose
**Analysis Engine:** Tree-sitter, AST and static analysis
**Supporting Technologies:** Redis, Joi and Docker Compose
**Integrations:** Groq, OpenAI, GitHub, Cloudinary and Voxide

## Project Overview

ReviewX is an AI-powered code review platform designed to help developers identify potential security vulnerabilities, programming errors and code-quality issues.

The platform combines structured source-code parsing, static analysis and optional AI assistance to provide review findings, explanations and remediation recommendations.

## Project Objectives

* Identify potential security vulnerabilities and programming errors.
* Analyze supported source code using AST-based parsing and static analysis.
* Provide structured findings and remediation guidance.
* Manage projects, reviews and reports.
* Enforce subscription-tier limits and feature permissions.
* Integrate external AI providers and development services.
* Maintain a secure, modular and maintainable architecture.

## Core Features

* **Automated Code Review:** Analyze submitted source code for supported issues.
* **Static Analysis:** Detect potential security, correctness and maintainability problems.
* **AST-Based Analysis:** Examine source-code structure using supported parsers.
* **AI Assistance:** Generate explanations and remediation suggestions when enabled.
* **Review Management:** Organize findings by severity, confidence and status.
* **Project Management:** Associate reviews with relevant projects.
* **Report Generation:** Support available JSON, HTML and PDF formats according to the user's tier.
* **GitHub Integration:** Support authorized repository-review workflows.
* **Subscription Tiers:** Apply feature permissions and resource limits.
* **File and Report Storage:** Use Cloudinary for supported storage workflows.

## System Architecture

ReviewX follows a modular frontend and backend architecture.

```text
React Frontend
      |
      v
Express.js REST API
      |
      v
Middleware and Joi Validation
      |
      v
Controllers
      |
      v
Services
      |
      +---- Code Analysis Engine
      |          |
      |          +---- Tree-sitter / AST
      |          +---- Static Analyzers
      |          +---- Optional AI Assistance
      |
      +---- Repositories ---- MongoDB
      |
      +---- External Integrations
                 |
                 +---- GitHub
                 +---- Cloudinary
                 +---- Groq / OpenAI

Redis: Supporting service for configured workflows
```

The frontend manages user interaction. The Express.js backend handles validation, authorization, business logic, analysis workflows and persistence.

## Technology Stack

| Technology              | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| React                   | Frontend user interface                               |
| JavaScript / ES Modules | Application implementation                            |
| Express.js              | Backend REST API                                      |
| MongoDB                 | Document database                                     |
| Mongoose                | Database models and operations                        |
| Joi                     | Request validation                                    |
| Tree-sitter / AST       | Structured source-code parsing                        |
| Redis                   | Configured caching or background-processing workflows |
| Groq / OpenAI           | Optional AI-assisted review                           |
| GitHub                  | Authorized repository integration                     |
| Cloudinary              | Supported file and report storage                     |
| Docker Compose          | Backend services and container management             |

## Code Review Engine

The analysis engine processes submitted source code and produces structured findings.

**Review workflow:**

* Validate the submitted source code and applicable usage limits.
* Identify the programming language.
* Parse supported source files.
* Execute applicable static analyzers.
* Normalize and organize findings.
* Generate AI-assisted explanations when enabled.
* Store applicable review data and return the results.

Potential finding categories include SQL injection, broken access control, authentication problems, null or undefined handling, logic errors, excessive complexity, unused code and N+1 query patterns. Actual detection coverage depends on the implemented analyzers and rules.

### Finding Classification

| Field      | Values                                                 |
| ---------- | ------------------------------------------------------ |
| Severity   | Critical, High, Medium, Low, Info                      |
| Confidence | High, Medium, Low                                      |
| Status     | Detected, Verified, False Positive, Accepted, Resolved |

Severity describes potential impact, while confidence indicates the strength of the available evidence. Findings and AI recommendations require appropriate review and should not be treated as guaranteed security conclusions.

## Subscription Tiers

ReviewX defines three intended tiers with different resource limits and features.

| Capability                    | Free         | Pro             | Enterprise      |
| ----------------------------- | ------------ | --------------- | --------------- |
| Source-code lines             | 500          | 5,000           | Unlimited       |
| Number of files               | 1            | 100             | Unlimited       |
| ZIP uploads                   | Not included | Included        | Included        |
| Report formats                | JSON         | JSON, HTML, PDF | JSON, HTML, PDF |
| AI remediation                | Disabled     | Enabled         | Enabled         |
| GitHub integration            | Not included | Not included    | Included        |
| Company-specific review rules | Not included | Not included    | Included        |

**Enterprise limits:** Source-code lines and file counts are unlimited at the subscription-plan level. Global technical safeguards, such as request-size limits, archive-size limits, processing capacity and external AI-provider limits, may still apply. These safeguards are separate from subscription limits.

All tier restrictions must be enforced by backend services rather than relying only on frontend controls. The deployed configuration must match these plan definitions.

## Backend Architecture

The backend follows a layered architecture with clearly separated responsibilities.

* **Routes:** Define API endpoints and connect requests to handlers.
* **Middleware:** Handle authentication, authorization and shared request processing.
* **Controllers:** Coordinate HTTP requests and responses.
* **Services:** Implement business logic and coordinate application workflows.
* **Validation:** Use Joi schemas to validate incoming data.
* **Repositories:** Isolate database operations.
* **Analysis Engine:** Coordinate parsing and static analyzers.
* **Integrations:** Encapsulate communication with external services.
* **Configuration:** Centralize environment variables and application settings.
* **Error Handling and Logging:** Standardize error responses and operational diagnostics.

Controllers should not contain substantial business logic or access the database directly. Database operations should remain within the repository layer.

## Database and Data Management

MongoDB stores application data, while Mongoose provides schemas and database operations.

The data model may include projects, reviews, findings, ownership information and integration metadata, depending on the implemented features.

The backend must enforce resource ownership and authorization before returning or modifying protected records. Successful API responses must reflect completed operations rather than assumed database persistence.

## API Design

The Express.js backend exposes REST endpoints for supported platform operations.

Each endpoint should document its HTTP method, route, authentication requirements, request validation, response format, tier restrictions and relevant database or integration effects.

Where implemented, a standard success response may follow this structure:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "request-correlation-id"
  }
}
```

Validation failures, authentication errors, authorization failures, missing resources, tier-limit violations and unexpected server errors should use consistent response formats.

The definitive API reference must match the actual registered routes and implemented service contracts.

## Security and Privacy

ReviewX processes source code that may contain confidential information. Secure handling is therefore essential.

Key security requirements include:

* Validate all untrusted input.
* Authenticate users and authorize protected operations.
* Enforce resource ownership and subscription limits on the backend.
* Store credentials in environment configuration rather than source control.
* Apply source-code, archive-size and file-count safeguards.
* Protect archive extraction against path traversal.
* Never execute submitted source code as part of static analysis.
* Limit sensitive source-code transfers to external AI services.
* Validate AI-generated output before using it.
* Avoid exposing secrets and internal stack traces.
* Configure suitable request limits, CORS policies and security headers.
* Define appropriate data-retention and deletion procedures.

## External Integrations

**Groq and OpenAI:** Provide optional AI-assisted explanations and remediation according to configured providers and enabled features.

**GitHub:** Supports authorized repository workflows and must respect repository permissions.

**Cloudinary:** Supports configured file and report storage operations.

**Redis:** Provides the functionality required by configured caching or background-processing workflows.

**Voxide:** Provides its implemented integration-specific functionality. Its precise role should be documented according to the current implementation.

All integrations should use centralized configuration, appropriate access controls and consistent error handling.

## Configuration and Environment

Application configuration should be centralized and validated at startup.

Example configuration values include:

```dotenv
APP_NAME=professional-ai-code-review
DB_NAME=ai_code_review
AI_ENABLED=false
AI_PROVIDER=groq
USER_TIER=free
SOURCE_MAX_BYTES=1048576
ARCHIVE_MAX_BYTES=10485760
MAX_FILES=1000
REDIS_URL=redis://127.0.0.1:6379
```

These are example project settings, not a complete verified inventory of every environment variable. Use the actual variable names and defaults defined by the backend. Never commit real API keys, database credentials or authentication secrets.

## Installation and Local Development

### Prerequisites

Install the following before starting development:

* Git
* A supported Node.js version and npm
* Docker Desktop with Docker Compose
* MongoDB access, local or hosted
* Required environment variables and external-service credentials

The frontend runs locally with npm. The backend uses npm for dependency installation and Docker Compose for its containerized services.

### Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

Use the actual repository URL and directory name.

### Backend Setup

Open a terminal in the backend directory:

```bash
cd backend
npm i
```

Install backend dependencies before building the Docker images.

Build the backend services:

```bash
docker compose build
```

Start the services in the background:

```bash
docker compose up -d
```

Check the service status:

```bash
docker compose ps
```

View recent logs if a service fails to start:

```bash
docker compose logs --tail=100
```

Follow live logs when troubleshooting:

```bash
docker compose logs -f
```

**Important:** Run Docker Compose commands from the directory containing the applicable `compose.yaml` or `docker-compose.yml` file. If the Compose file is at the repository root rather than inside `backend`, run the commands from that root directory instead. Use the service definitions and environment settings provided by the repository.

### Frontend Setup

Open a separate terminal in the frontend directory:

```bash
cd frontend
npm i
npm run dev
```

The frontend runs directly through the development server. **Do not build or run the frontend with Docker** for this local development workflow.

After running `npm run dev`, open the local URL printed in the terminal, commonly a Vite development URL such as `http://localhost:5173`. Use the actual URL displayed by your application.

### Development Workflow Summary

| Component       | Installation | Start / Build                                       |
| --------------- | ------------ | --------------------------------------------------- |
| Backend         | `npm i`      | `docker compose build`, then `docker compose up -d` |
| Backend status  | —            | `docker compose ps`                                 |
| Frontend        | `npm i`      | `npm run dev`                                       |
| Frontend Docker | Not used     | Not required                                        |

The backend and frontend run separately during development. Ensure the frontend API base URL points to the correct backend address and port, and configure CORS appropriately.

## Deployment and Operations

Production deployment should include:

* Secure environment and secret management.
* Persistent database storage and regular backups.
* Health checks for required services.
* Monitoring and centralized logs.
* Appropriate resource limits and processing concurrency.
* Controlled dependency updates.
* Reliable error handling and recovery procedures.

The local development commands above are not, by themselves, a complete production deployment procedure.

## Performance and Reliability

The platform should manage resource consumption through source and archive limits, tier enforcement, bounded AI requests, provider timeouts, appropriate analysis concurrency and efficient database queries.

External-service failures must be handled predictably. The backend should not report an operation as successful if a required processing or persistence step has failed.

## Testing and Quality Assurance

Important verification areas include:

* Request validation and authorization.
* Subscription-tier enforcement.
* Analyzer accuracy and supported-language handling.
* Resource ownership and database persistence.
* File and archive safety.
* AI-disabled behavior.
* External-service failure handling.
* Docker Compose service health.
* Frontend-to-backend connectivity.

Only report tests as passed when they have actually been executed and the results recorded.

## Limitations

* Static analysis may produce false positives and false negatives.
* Language support depends on installed parsers and implemented rules.
* AI-generated recommendations may be inaccurate.
* External integrations depend on valid credentials and service availability.
* Technical safeguards may apply even to Enterprise plans.
* Exact API behavior and data relationships depend on the current implementation.

## Conclusion

ReviewX provides a structured approach to code review by combining source-code parsing, static analysis, optional AI assistance and external integrations.

Its layered Express.js backend separates business logic, validation, database access and analysis responsibilities. The React frontend runs locally through npm during development, while the backend is built and managed through Docker Compose.

Reliable operation depends on secure authorization, accurate analyzer rules, consistent tier enforcement, safe source-code handling and correct environment configuration.

## Final Implementation Checklist

* [x] Confirm API routes, request schemas and response formats.
* [x] Confirm database models, relationships and indexes.
* [x] Verify supported languages and implemented analyzer rules.
* [x] Ensure Free, Pro and Enterprise policies match backend enforcement.
* [x] Validate all required environment variables.
* [x] Confirm authentication and authorization behavior.
* [x] Verify GitHub, Cloudinary, AI-provider and Voxide integrations.
* [x] Confirm Redis and Docker Compose service configuration.
* [x] Verify backend setup using `npm i` and Docker Compose.
* [x] Verify frontend setup using `npm i` and `npm run dev`, without Docker.
* [x] Confirm frontend-to-backend connectivity.
* [x] Record actual test results, operational requirements and known limitations.
