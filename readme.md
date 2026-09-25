# 🌌 Atlas Multimodal AI Portal (v3.0.0)

**🌐 Live Demo:** [https://atlas-multimodal-ai-portal.onrender.com/](https://atlas-multimodal-ai-portal.onrender.com/)

<p align="center">
  <img src="static/screenshots/new_chat_home.png" alt="Atlas Minimalist Workspace & Starter Modules" width="850" />
</p>

Atlas is an enterprise-grade autonomous intelligence platform for industrial operations, technical research, and field engineering. Built on a modular **LangGraph** ReAct state machine, an intelligent multi-provider **LLM Gateway**, and a high-performance **FastAPI** backend, Atlas delivers real-time equipment telemetry diagnostics, physics-grounded engineering analysis, hybrid dense retrieval (RAG), and rich multimodal document intelligence.

---

## 🎨 Clean Minimalist Design & Modern UX

The user interface has been completely redesigned with a refined, human-centric aesthetic:
* **Minimalist Light Aesthetic:** Harmonious slate, ceramic, and indigo palette (`#4F46E5`) with subtle border geometry and gentle shadows.
* **Floating Composer with Action Pills:** Sleek composer featuring quick-action trigger chips (`Status`, `SOP`, `Calculate`, `Ticket`, `Summarize`, `Combine tasks`, `Prompt library`).
* **Interactive Canvas Workspace:** Split-pane drawer that slides open automatically to display interactive 16:9 widescreen presentation decks, multi-column scientific research posters, code blocks, or full-resolution media previews.
* **Collapsible Navigation & Chat Search:** Instant client-side search across conversation threads, quick thread creation, and soft-delete with 30-day recovery.
* **Zero-Interruption Guest Experience:** Seamless guest access with automatic session creation—no setup required to get started.

<p align="center">
  <img src="static/screenshots/login_screen.png" alt="Atlas Clean Authentication & Guest Portal" width="850" />
</p>

---

## 📊 Architecture & Tracing Flow

The Atlas runtime is organized into five modular, sequential stages. Every incoming payload flows progressively through security sanitization, resilient gateway routing, multi-turn state machine reasoning, hybrid tool retrieval, and persistent checkpointer storage:

```mermaid
flowchart LR
    classDef stepStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:2px;

    Step1["🛡️ Step 1<br/><b>Guardrails</b>"]:::stepStyle --> Step2["⚡ Step 2<br/><b>Smart Gateway</b>"]:::stepStyle
    Step2 --> Step3["🧠 Step 3<br/><b>LangGraph ReAct</b>"]:::stepStyle
    Step3 --> Step4["🔍 Step 4<br/><b>Hybrid Tools & RAG</b>"]:::stepStyle
    Step4 --> Step5["💾 Step 5<br/><b>Persistence & Egress</b>"]:::stepStyle
```

---

### 🛡️ Step 1: Input Ingestion & Enterprise Guardrails
Before prompts reach the LLM or gateway, every incoming payload (text, PDF, audio, or images) is inspected and sanitized:

```mermaid
flowchart TD
    classDef guardStyle fill:#FEF2F2,stroke:#EF4444,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    User(["👤 User Prompt & Uploads"]):::clientStyle --> Ingress["🌐 FastAPI Endpoint & SSE Stream"]:::clientStyle
    Ingress --> InjectionCheck{"Prompt Injection?"}:::guardStyle
    InjectionCheck -- Detected --> BlockPayload["🚫 Reject & Audit Flag"]:::guardStyle
    InjectionCheck -- Clean --> PIIMask["🔒 Heuristic & Regex PII Masking"]:::guardStyle
    PIIMask --> SafetyRules["⚠️ Industrial Safety & Limits Check"]:::guardStyle
    SafetyRules --> GatewayEgress(["Proceed to LLM Gateway"]):::clientStyle
```

- **Prompt Injection Defense:** Blocks jailbreak attempts, delimiter hijackings, and system prompt extraction patterns.
- **Automated PII Masking:** Redacts emails, phone numbers, API keys, and sensitive employee credentials before LLM ingestion.
- **Physics-Grounded Safety Verification:** Evaluates operational parameter limits and flags hazardous industrial conditions with engineering explanations rather than generic warnings.

---

### ⚡ Step 2: Smart LLM Gateway & Resilience
The intelligent gateway manages traffic, prevents API rate-limiting, and routes requests across models:

```mermaid
flowchart TD
    classDef gatewayStyle fill:#F0FDF4,stroke:#16A34A,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    GuardrailInput(["From Step 1 Guardrails"]):::clientStyle --> CacheCheck{"SHA-256 Cache Hit?"}:::gatewayStyle
    CacheCheck -- Hit --> FastReturn["⚡ Immediate Cached Response"]:::gatewayStyle
    CacheCheck -- Miss --> RateLimit["⏱️ Sliding-Window & Token-Bucket Rate Limiter"]:::gatewayStyle
    RateLimit --> CircuitBreaker{"Circuit Breaker State"}:::gatewayStyle
    CircuitBreaker -- "CLOSED / HALF-OPEN" --> PrimaryLLM["Groq Qwen 3.8-27B / GPT-OSS 120B"]:::gatewayStyle
    PrimaryLLM -- "429 / Timeout" --> FallbackLLM["OpenRouter Multi-Provider Fallback"]:::gatewayStyle
    CircuitBreaker -- "OPEN" --> FallbackLLM
    FallbackLLM --> GraphIngress(["Proceed to LangGraph Engine"]):::clientStyle
    PrimaryLLM --> GraphIngress
```

- **Query Caching:** Instant response delivery on repeated queries, saving token quotas and reducing latency.
- **Sliding-Window Rate Limiting:** Enforces per-minute and per-day user token and request limits.
- **3-State Circuit Breaker:** Automatically trips on consecutive upstream provider errors (`CLOSED`, `OPEN`, `HALF_OPEN`) to protect system throughput.
- **Smart Model Routing:** Auto-routes standard prompts to ultra-fast Groq inference and multimodal vision requests to OpenRouter Qwen-2-VL.

---

### 🧠 Step 3: LangGraph ReAct Orchestration Cycle
The multi-turn conversational core manages intent detection, token conservation, and agent reasoning loops:

```mermaid
flowchart TD
    classDef agentStyle fill:#F5F3FF,stroke:#7C3AED,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    GatewayInput(["From Step 2 Gateway"]):::clientStyle --> IntentRouting["classify_intent"]:::agentStyle
    IntentRouting --> EscalationCheck{"Needs Escalation?"}:::agentStyle
    EscalationCheck -- Yes --> FlagEscalation["escalation_check / Priority Ticket"]:::agentStyle
    EscalationCheck -- No --> CompressHistory["compress_history / Context Summary"]:::agentStyle
    FlagEscalation --> CompressHistory
    CompressHistory --> AgentCore["agent_node / ReAct Reasoner"]:::agentStyle
    AgentCore --> ToolCallDecision{"Requires Tool Call?"}:::agentStyle
    ToolCallDecision -- Yes --> ToolDispatch(["Step 4: Execute Tools & RAG"]):::clientStyle
    ToolCallDecision -- No --> VerificationStep(["Proceed to Step 5: Output Filter"]):::clientStyle
```

- **Intent Classification:** Rapidly categorizes queries into `technical_support`, `knowledge_query`, `escalation`, or `general`.
- **Dynamic Context Compression:** Automatically summarizes conversations beyond 12 turns, preventing token overflow while preserving critical IDs and state.
- **ReAct Feedback Loop:** Interleaves reasoning thoughts, tool calls, and observation results until the task is completely resolved.

---

### 🔍 Step 4: Hybrid Dense RAG & Multimodal Tool Execution
When the agent determines external data or real-world action is required, it accesses Atlas's tool ecosystem:

```mermaid
flowchart TD
    classDef toolStyle fill:#FFFBEB,stroke:#D97706,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    ToolCall(["Agent Tool Invocation"]):::clientStyle --> Dispatcher{"Tool Type"}:::toolStyle

    Dispatcher --> DenseRAG["Dense Vector Search (128-dim)"]:::toolStyle
    Dispatcher --> KeywordRAG["BM25 Keyword Search"]:::toolStyle
    DenseRAG & KeywordRAG --> RRFMerge["Reciprocal Rank Fusion (RRF)"]:::toolStyle

    Dispatcher --> WebTools["URL Scraper & DuckDuckGo Search"]:::toolStyle
    Dispatcher --> IndustrialDB["Equipment Telemetry & SCADA DB"]:::toolStyle
    Dispatcher --> MCPBridge["MCP External Server Integrations"]:::toolStyle
    Dispatcher --> MediaEngine["Slide & Poster Engine / Whisper Audio"]:::toolStyle

    RRFMerge & WebTools & IndustrialDB & MCPBridge & MediaEngine --> ToolResult(["Observation Feedback to Step 3 Agent"]):::clientStyle
```

- **Hybrid Dense Retrieval (RRF):** Combines 128-dimensional dense vector embeddings with BM25 keyword matching using Reciprocal Rank Fusion.
- **URL & Web Extractor (`fetch_webpage_content`):** Directly fetches and digests live web pages when users supply links.
- **High-Performance Upload Pipeline:** Automatic image downscaling and optimization via Pillow (exif orientation preservation, lanczos thumbnailing, 85% compression) with guest cookie auto-provisioning to eliminate 401 Unauthorized errors.
- **Multimodal Engines:** PDF document text extraction, Qwen-2-VL vision processing, Whisper audio transcription, and slide/poster generation.
- **MCP Extensibility:** Plug-and-play Model Context Protocol server tools dynamically registered at startup.

---

### 💾 Step 5: Enterprise Persistence, Checkpointing & Streaming Egress
The final response undergoes output security filtering before being persisted and streamed to the user:

```mermaid
flowchart TD
    classDef storageStyle fill:#FFFBEB,stroke:#D97706,stroke-width:1.5px;
    classDef guardStyle fill:#FEF2F2,stroke:#EF4444,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    AgentOutput(["Agent Final Response"]):::clientStyle --> OutputFilter["Output Guardrails & Safety Filter"]:::guardStyle
    OutputFilter --> Checkpointer[("Neon PostgreSQL / SQLite WAL Checkpointer")]:::storageStyle
    OutputFilter --> Audit[("Audit Log & Security Trail")]:::storageStyle
    OutputFilter --> SSEStream["SSE Token Streaming"]:::clientStyle
    SSEStream --> ClientApp(["Client Response & Canvas Artifacts"]):::clientStyle
```

- **Dual-Engine Checkpointing:** Remote serverless Neon PostgreSQL with automatic local SQLite WAL fallback for zero-downtime persistence.
- **Output Guardrails:** Verifies safety statements, strips unintended leakage, and enforces structural formatting.
- **Server-Sent Events (SSE):** Real-time streaming tokens with automatic browser Markdown link formatting (`target="_blank"`).
- **Interactive Canvas Artifacts:** Slide presentation player, research poster viewer, and native `.pptx` / `.pdf` export generation.

---

## 💬 Conversational Workspace & Multimodal Output

<p align="center">
  <img src="static/screenshots/chat_conversation.png" alt="Atlas Conversational Workspace & Structured Markdown" width="850" />
</p>

Atlas structures complex technical analyses into clean, readable outputs:
* **Interactive Slide Decks (`<presentation>`):** Native multi-slide presenter with slide navigation dots, card transitions, and one-click PowerPoint (`.pptx`) or PDF export.
* **Academic & Conference Posters (`<poster>`):** High-density multi-column research poster builder rendered dynamically with instant ReportLab PDF export.
* **Rich Markdown Formatting:** Custom styling for tables, code blocks with syntax highlighting, bulleted equipment lists, and downloadable media cards.
* **Click-to-Preview Media:** Uploaded schematics and photos can be clicked to open in the wide Canvas viewer without stretching chat bubbles.

---

## 🌟 Comprehensive Capabilities Matrix

Atlas supports a broad set of production and enterprise capabilities out-of-the-box:

### 🟢 AI Agent & Reasoning
* **💬 Natural Language Conversation:** Context-aware, human-like dialog with multi-turn memory.
* **🧠 Conversation Memory:** Real-time context compression, session persistence, and fact extraction.
* **🌍 Multi-Language Support:** Auto-detection and output alignment in 10+ major regional languages (English, Hindi, Gujarati, Tamil, Telugu, Hinglish, etc.).
* **📄 Document Understanding:** PDF text extraction, document parsing, and token-safe summarization.
* **🔍 Semantic Search (RAG):** Hybrid BM25/Dense retrieval over local knowledge bases and SOP documents.
* **🌐 Web Search & Stock Pricing:** Real-time web result parsing and public stock ticker metrics.
* **🧮 Engineering Calculator:** Safe mathematical, thermodynamic, and chronological calculation evaluator.

### 🟢 Multimodal Intelligence
* **🖼️ Image Understanding:** Vision-enabled analysis of engineering schematics, wiring diagrams, or equipment photos.
* **📸 OCR & Document Intelligence:** Text extraction from invoices, contracts, manuals, and receipts.
* **📊 Chart & Graph Interpretation:** Visual analysis of trendlines, telemetry dashboards, and data sheets.
* **🎤 Speech & Audio Processing:** Real-time microphone input and transcription powered by Whisper-large-v3.

### 🟢 Productivity & Artifacts
* **✍️ Content Generation:** PowerPoint slide compilation (`.pptx`), conference poster generation (`.pdf`), and Markdown exports.
* **🛠️ Coding Assistant:** Code explanation, optimization, SQL query writing, and bug diagnosis.
* **📅 Operations Handover:** Structured format exports (maintenance tickets, SOP summaries, shift handover logs).
* **📚 Ready-Made Playbooks:** Built-in prompt template library with 2,500+ pre-configured playbooks for industrial diagnostics, calculations, slide decks, and academic posters.

### 🟢 Enterprise Security & Resilience
* **🛡️ Enterprise Guardrails Engine:** Prompt injection detector, regex/heuristic PII masking, and physics-grounded limit verification.
* **⚡ Smart LLM Gateway:** Multi-provider model routing, token-bucket and sliding-window rate limiting, 3-state circuit breaker, and SHA-256 query caching.
* **💾 Enterprise Persistence:** Remote serverless Neon PostgreSQL checkpointer with automatic SQLite WAL-mode fallback.
* **🔒 Authentication & Session Security:** Signed JWT cookies, automatic guest session provision, and brute-force lockout protection.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI, Python 3.11+, Uvicorn (ASGI) |
| **Agentic State Machine** | LangGraph, LangChain Core |
| **LLM Inference** | Groq (Qwen 3.8-27B / GPT-OSS), OpenRouter Fallback |
| **Observability & Tracing** | LangSmith |
| **Database & Persistence** | Neon Serverless PostgreSQL & SQLite (WAL mode) |
| **Media & Vision** | Pillow (image optimization), Whisper-large-v3, pypdf |
| **Document Export Engines**| ReportLab (vector PDF posters), python-pptx (presentation slides) |
| **Frontend UI** | Vanilla ES6+ JavaScript, CSS3 Design Tokens (Light Minimalist Theme) |
| **Client Libraries** | Lucide Icons, Marked.js (Markdown), Highlight.js, Chart.js |

---

## 📂 Project Structure

```bash
├── asset_export.py     # Presentation (.pptx/.pdf) & research poster PDF compilers
├── config.py           # Central Settings class and environment configuration
├── cli.py              # Terminal CLI client for local debugging
├── Dockerfile          # Containerization template
├── graph.py            # LangGraph state machine flow setup
├── logger.py           # Custom formatted console/file logging
├── main.py             # FastAPI App (endpoints, JWT authentication, SSE stream)
├── nodes.py            # Graph nodes logic & SYSTEM_PROMPT definitions
├── readme.md           # Project documentation
├── requirements.txt    # Python package dependencies
├── state.py            # TypedDict definition of the chat state
├── tools.py            # Custom tools: RAG retriever, SCADA status, calculator, web search
├── db/                 # Database initialization, SQLite & PostgreSQL checkpointers
├── engine/             # Dense vector search, BM25 retriever, and RRF ranker
├── gateway/            # LLM gateway, circuit breaker, rate limiter, cache
├── guardrails/         # Input injection sanitizer, PII masking, safety manager
├── evaluation/         # Golden benchmark evaluation suite (92.00% score)
└── static/             # Frontend web assets
    ├── index.html      # Main single-page application UI
    ├── prompts.json    # 2,500+ pre-configured prompt playbooks
    ├── screenshots/    # UI screenshots & preview assets
    └── uploads/        # Uploaded images, audio, and documents
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root directory to configure the application:

```ini
# LLM & API Keys
GROQ_API_KEY="gsk_..."
BACKUP_GROQ_API_KEY="gsk_..."  # Optional, rotated automatically on rate limits
OPENROUTER_API_KEY="sk-or-..." # Optional, multi-provider fallback
REPLICATE_API_TOKEN="r8_..."   # Optional, required for video generation

# LangSmith Tracing (Observability)
LANGCHAIN_TRACING_V2="true"
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY="lsv2_pt_..."
LANGCHAIN_PROJECT="multilingualchat"

# Database Configuration
SQLITE_DB_PATH="chatbot_memory.db"
# DATABASE_URL="postgresql://user:password@ep-neon.us-east-2.aws.neon.tech/neondb" # Optional Neon Postgres

# Compression Settings
MAX_MESSAGES_BEFORE_SUMMARY=12
KEEP_LAST_N_AFTER_SUMMARY=4
```

---

## 🚀 Running the Application

### Option A: Running Locally

1. **Create and Activate a Virtual Environment:**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the Uvicorn Server:**
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Verify Application:**
   Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### Option B: Running with Docker

1. **Build the Docker Image:**
   ```bash
   docker build -t atlas-multimodal-ai-portal .
   ```

2. **Run the Container:**
   ```bash
   docker run -d -p 8000:8000 --name atlas-portal --env-file .env atlas-multimodal-ai-portal
   ```

3. **Access the Portal:**
   Open [http://localhost:8000](http://localhost:8000) in your web browser.

---

## 📝 CLI Mode (For Local Terminal Debugging)

To test the chatbot state machine directly from the command line without the web portal:
```bash
python cli.py --thread my-debug-session
```
*Note: Threads are persisted in SQLite, allowing you to resume terminal sessions later.*