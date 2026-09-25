# 🌌 Atlas Multimodal AI Portal (v3.0.0)

**🌐 Live Demo:** [https://atlas-multimodal-ai-portal.onrender.com/](https://atlas-multimodal-ai-portal.onrender.com/)

<p align="center">
  <img src="static/screenshots/login_screen.png" alt="Atlas Login Screen" width="800" />
</p>

Atlas is an advanced, enterprise-grade operations co-pilot and industrial support chatbot. Built on a modular **LangGraph** state machine and a high-performance **FastAPI** backend, Atlas features a premium glassmorphic frontend UI designed to assist industrial engineers, plant operators, and researchers.

---

## 📊 Architecture & Tracing Flow

The Atlas architecture is organized into five modular, sequential stages. Every user request flows progressively from security sanitization to resilient gateway routing, multi-turn state machine reasoning, hybrid tool retrieval, and persistent checkpointer storage:

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

    User([👤 User Prompt & Uploads]):::clientStyle --> Ingress[🌐 FastAPI Endpoint & SSE Stream]:::clientStyle
    Ingress --> InjectionCheck{Prompt Injection?}:::guardStyle
    InjectionCheck -- Detected --> BlockPayload[🚫 Reject & Audit Flag]:::guardStyle
    InjectionCheck -- Clean --> PIIMask[🔒 Heuristic & Regex PII Masking]:::guardStyle
    PIIMask --> SafetyRules[⚠️ Industrial Safety & LOTO Interlocks]:::guardStyle
    SafetyRules --> GatewayEgress([Proceed to LLM Gateway]):::clientStyle
```

- **Prompt Injection Defense:** Blocks jailbreak attempts, delimiter hijackings, and system prompt extraction.
- **Automated PII Masking:** Redacts emails, phone numbers, API keys, and sensitive employee credentials.
- **Safety Interlocks:** Validates mandatory Lockout/Tagout (LOTO) protocols and safety warnings on high-risk industrial equipment.

---

### ⚡ Step 2: Smart LLM Gateway & Resilience
The intelligent gateway manages traffic, prevents API rate-limiting, and routes requests across models:

```mermaid
flowchart TD
    classDef gatewayStyle fill:#F0FDF4,stroke:#16A34A,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    GuardrailInput([From Step 1 Guardrails]):::clientStyle --> CacheCheck{SHA-256 Cache Hit?}:::gatewayStyle
    CacheCheck -- Hit --> FastReturn[⚡ Immediate Cached Response]:::gatewayStyle
    CacheCheck -- Miss --> RateLimit[⏱️ Sliding-Window & Token-Bucket Rate Limiter]:::gatewayStyle
    RateLimit --> CircuitBreaker{Circuit Breaker State}:::gatewayStyle
    CircuitBreaker -- CLOSED / HALF-OPEN --> PrimaryLLM[Groq Qwen 3.8-27B / GPT-OSS 120B]:::gatewayStyle
    PrimaryLLM -- 429 / Timeout --> FallbackLLM[OpenRouter Multi-Provider Fallback]:::gatewayStyle
    CircuitBreaker -- OPEN --> FallbackLLM
    FallbackLLM --> GraphIngress([Proceed to LangGraph Engine]):::clientStyle
    PrimaryLLM --> GraphIngress
```

- **Query Caching:** Instant response delivery on repeated queries, saving token quotas and reducing latency.
- **Sliding-Window Rate Limiting:** Enforces per-minute and per-day user token and request limits.
- **3-State Circuit Breaker:** Automatically trips on consecutive upstream provider errors to protect throughput.
- **Smart Model Routing:** Auto-routes standard prompts to ultra-fast Groq inference and multimodal vision requests to OpenRouter Qwen-2-VL.

---

### 🧠 Step 3: LangGraph ReAct Orchestration Cycle
The multi-turn conversational core manages intent detection, token conservation, and agent reasoning loops:

```mermaid
flowchart TD
    classDef agentStyle fill:#F5F3FF,stroke:#7C3AED,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    GatewayInput([From Step 2 Gateway]):::clientStyle --> IntentRouting[classify_intent]:::agentStyle
    IntentRouting --> EscalationCheck{Needs Escalation?}:::agentStyle
    EscalationCheck -- Yes --> FlagEscalation[escalation_check / Priority Ticket]:::agentStyle
    EscalationCheck -- No --> CompressHistory[compress_history / Context Summary]:::agentStyle
    FlagEscalation --> CompressHistory
    CompressHistory --> AgentCore[agent_node / ReAct Reasoner]:::agentStyle
    AgentCore --> ToolCallDecision{Requires Tool Call?}:::agentStyle
    ToolCallDecision -- Yes --> ToolDispatch([Step 4: Execute Tools & RAG]):::clientStyle
    ToolCallDecision -- No --> VerificationStep([Proceed to Step 5: Output Filter]):::clientStyle
```

- **Intent Classification:** Rapidly categorizes queries into `technical_support`, `knowledge_query`, `escalation`, or `general`.
- **Dynamic Context Compression:** Automatically summarizes conversations beyond 12 turns, preventing token overflow while preserving critical IDs and state.
- **ReAct Feedback Loop:** Interleaves reasoning thoughts, tool calls, and observation results until the task is resolved.

---

### 🔍 Step 4: Hybrid Dense RAG & Multimodal Tool Execution
When the agent determines external data or real-world action is required, it accesses Atlas's tool ecosystem:

```mermaid
flowchart TD
    classDef toolStyle fill:#FFFBEB,stroke:#D97706,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    ToolCall([Agent Tool Invocation]):::clientStyle --> Dispatcher{Tool Type}:::toolStyle

    Dispatcher --> DenseRAG[Dense Vector Search (128-dim)]:::toolStyle
    Dispatcher --> KeywordRAG[BM25 Keyword Search]:::toolStyle
    DenseRAG & KeywordRAG --> RRFMerge[Reciprocal Rank Fusion (RRF)]:::toolStyle

    Dispatcher --> WebTools[URL Scraper & DuckDuckGo Search]:::toolStyle
    Dispatcher --> IndustrialDB[SCADA Telemetry & Equipment Status DB]:::toolStyle
    Dispatcher --> MCPBridge[MCP External Server Integrations]:::toolStyle
    Dispatcher --> MediaEngine[Image / Video Generation & Whisper Audio]:::toolStyle

    RRFMerge & WebTools & IndustrialDB & MCPBridge & MediaEngine --> ToolResult([Observation Feedback to Step 3 Agent]):::clientStyle
```

- **Hybrid Dense Retrieval (RRF):** Combines 128-dimensional dense vector embeddings with BM25 keyword matching using Reciprocal Rank Fusion.
- **URL & Web Extractor (`fetch_webpage_content`):** Directly fetches and reads live web pages when users supply links.
- **Multimodal Engines:** PDF document text extraction, Qwen-2-VL vision processing, Whisper audio transcription, and Pollinations/Replicate image and video generators.
- **MCP Extensibility:** Plug-and-play Model Context Protocol server tools dynamically registered at startup.

---

### 💾 Step 5: Enterprise Persistence, Checkpointing & Streaming Egress
The final response undergoes output security filtering before being persisted and streamed to the user:

```mermaid
flowchart TD
    classDef storageStyle fill:#FFFBEB,stroke:#D97706,stroke-width:1.5px;
    classDef guardStyle fill:#FEF2F2,stroke:#EF4444,stroke-width:1.5px;
    classDef clientStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:1.5px;

    AgentOutput([Agent Final Response]):::clientStyle --> OutputFilter[Output Guardrails & Safety Filter]:::guardStyle
    OutputFilter --> Checkpointer[(Neon PostgreSQL / Local SQLite WAL)]:::storageStyle
    OutputFilter --> Audit[(Audit Log & Security Trail)]:::storageStyle
    OutputFilter --> SSEStream[SSE Token Streaming]:::clientStyle
    SSEStream --> ClientApp([💬 Interactive Chat & Canvas Artifacts]):::clientStyle
```

- **Dual-Engine Checkpointing:** Remote serverless Neon PostgreSQL with automatic local SQLite WAL fallback for zero-downtime persistence.
- **Output Guardrails:** Verifies safety statements, strips unintended leakage, and enforces structural formatting.
- **Server-Sent Events (SSE):** Real-time streaming tokens with automatic browser Markdown link formatting (`target="_blank"`).
- **Interactive Canvas Artifacts:** Slide presentation player, research poster viewer, and native `.pptx` / `.pdf` export generation.

---


## 🧠 Production-Grade Agentic Patterns

Atlas is built on architectural patterns designed to handle the realities of deploying agentic systems in production:

### 1. Robust State & Memory Hydration
- **SQLite Checkpointer (WAL Mode):** Replaces memory savers with transactional SQLite storage. The state is loaded and saved atomically at every step boundary, enabling session persistence across server crashes or scaling restarts.
- **Fact-Based Long-Term Memory:** Extracts structured entity relationships from conversations and writes them to a persistent SQLite Knowledge Graph. These memories are injected into the agent system prompt on thread load, matching user preference/history without wasting token budget.
- **Context Summarization:** When messages exceed 12 turns, a compression node consolidates older history into a running semantic summary while keeping the last few messages fresh.

### 2. Multi-Tier Error Resilience
- **Automated API Key Rotation:** Automatically cycles through multiple backup Groq API keys on hitting a `429 Rate Limit Error` to guarantee high availability.
- **Dynamic Model Fallback:** Automatically switches to alternative settings-based model names or rotates API keys if the primary setup experiences failures.
- **Exponential Backoff:** Retries failing LLM calls with customizable backoff delays.

### 3. Observability & LangSmith Integration
By activating LangSmith tracing, you unlock:
- **Trace Tagging & Metadata:** Automatically attaches rich metadata to every trace execution (such as `username`, `thread_id`, `language`, and `interface` (`web`/`cli`/`debug`)), enabling direct filtering, grouping, and analysis of runs in the LangSmith dashboard.
- **Playground Debugging:** Inspect and tweak the exact system prompt and tool results for any run directly from the cloud UI.
- **Token & Cost Control:** Monitor exact prompt/completion token usage across multiple runs.
- **Latency & Bottleneck Analysis:** Pinpoint which node (e.g., intent classification, tools execution) is slowing down the response.
- **Run Feedback Loops:** Capture and log user feedback on agent responses directly to LangSmith datasets for future fine-tuning.

---

## 🚀 Key Features

### 🧠 Agentic & Memory Core
- **LangGraph ReAct Architecture:** Seamless transition between intent classification, history compression, and ReAct loop execution.
- **Long-Term Memory:** Extracts permanent user/equipment facts into an SQLite entity-relation knowledge graph for personalized future context.
- **Context Compression:** Intelligent conversation summarization once history exceeds a limit, keeping token counts optimal.
- **Automatic Multi-Language Alignment:** Proactively detects and responds in the user's language (supporting English, Hindi, Gujarati, Tamil, Telugu, Hinglish, etc.).
- **Real-Time Web Search:** Queries the web on demand using integrated DuckDuckGo HTML scraping.
- **Real-Time Stock Lookup:** Retrieves stock prices and market metrics for any public company ticker symbol.

<p align="center">
  <img src="static/screenshots/multilingual_chat.png" alt="Multilingual Chat" width="800" />
</p>

---

## 🌟 Comprehensive Capabilities Matrix

Atlas supports a broad set of production and enterprise capabilities out-of-the-box, with built-in integrations and extensibility paths:

### 🟢 AI Agent Capabilities
* **💬 Natural Language Conversation:** Context-aware, human-like dialog with translation alignment.
* **🧠 Conversation Memory:** Real-time context compression, session persistence, and fact extraction.
* **🌍 Multi-Language Support:** Auto-detection and output alignment in 10+ major regional languages.
* **📄 Document Understanding:** PDF text extraction, document parsing, and token-safe summarization.
* **🔍 Semantic Search (RAG):** Hybrid BM25/Dense retrieval over local knowledge bases.
* **🌐 Web Search & Stock Pricing:** Real-time web result parsing and public stock ticker metrics.
* **🧮 Calculator & Reasoning:** Parser supporting mathematical, engineering, and chronological calculations.

### 🟢 Multimodal AI
* **🖼️ Image Understanding:** Vision-enabled analysis of schematics, drawings, or UI layouts.
* **📸 OCR & Document Intelligence:** Text extraction from invoices, contracts, manuals, and receipts.
* **📊 Chart & Graph Interpretation:** Analysis of trendlines, telemetry dashboards, and data sheets.
* **🎤 Speech & Audio Processing:** Transcription powered by Whisper-large-v3.

### 🟢 Productivity & Automation
* **✍️ Content Generation:** PowerPoint slide compilation (`.pptx`), PDF report generation (`.pdf`), and Markdown exports.
* **🛠️ Coding Assistant:** Code explanation, optimization, SQL query writing, and debug assistance.
* **📅 Productivity Integrations:** Structured format exports (tickets, SOP summaries, handover logs).
* **🛡️ Security & Enterprise Controls:** Role verification, sliding window rate limits, JWT session authentication, brute force protection, and structured audit logs.

### 🖼️ Multimodal Intelligence
- **Text-to-Image Generation:** Integrates Pollinations AI to generate schematics, charts, or diagrams. Assets are automatically downloaded and hosted locally for persistence.
- **Text-to-Video Generation:** Integrates Replicate's Stable Video Diffusion to generate short clips.
- **Audio & Video Transcription:** Transcribes media inputs using Whisper-large-v3.
- **PDF Text Extractor:** Automatically extracts content from uploaded documents and appends it to the LLM context.

### 📊 Interactive Visualizations & Artifacts
- **Interactive Presentation Presenter (`<presentation>`):** Renders slide decks in the UI with a native fullscreen slideshow player.
- **Research Poster Viewer (`<poster>`):** Renders scientific/academic multi-column research posters inside the canvas workspace.
- **Dynamic Charts (`<chart>`):** Automatically renders line, bar, or radar charts using Chart.js based on telemetry or numerical data.
- **MCP Extensions & Integrations:** Plug-and-play Model Context Protocol (MCP) servers and tools dynamically connected into the agent runtime.
- **Ready-Made Playbooks:** A built-in prompt template library with 2,500+ pre-configured playbooks for industrial diagnostics, calculations, slide decks, and academic posters.

<p align="center">
  <img src="static/screenshots/prompt_library.png" alt="Prompt Library Playbooks" width="800" />
</p>

### 📥 Enterprise Document Export
- **Slide Decks (`.pptx`):** Generates and downloads native PowerPoint slide presentations from LLM-designed slides using `python-pptx`.
- **Scientific Posters (`.pdf`):** Exports high-fidelity, landscape PDF scientific posters styled using `reportlab`.
- **Chat History:** Instantly download entire conversation threads as Markdown (`.md`), PDF (`.pdf`), or plain text (`.txt`).

### 🛡️ Enterprise Security & Resilience
- **Enterprise Guardrails Engine:** Prompt injection detector, regex/heuristic PII masking, and industrial safety interlocks (mandatory LOTO validation).
- **Smart LLM Gateway:** Multi-provider model routing, token-bucket and sliding-window rate limiting, 3-state circuit breaker (`CLOSED`, `OPEN`, `HALF_OPEN`), and SHA-256 query caching.
- **Hybrid Dense Retrieval Engine:** 128-dimensional dense semantic vector embeddings combined with BM25 keyword matching via Reciprocal Rank Fusion (RRF).
- **Remote Neon PostgreSQL Checkpointer:** Enterprise persistence backed by remote Neon serverless PostgreSQL with automatic SQLite WAL-mode local fallback.
- **2,500 Golden Benchmark Suite:** Automated evaluation suite achieving 92.00% benchmark score on domain intent classification and safety interlocks.
- **JWT Session Management:** HTTP-only, signed JWT session cookies with customizable TTL and client session persistence across page reloads.
- **Lockout Protection:** Temporary IP and account lockouts after repeated failed logins to prevent brute-force attacks.
- **Strict Media Validation:** Upload validator sniffing magic-bytes (not just extensions) to block malicious file payloads.

### 🔍 Production Observability
- **LangSmith Tracing:** Deep observability, tracing agent state transitions, intent classifications, raw prompts/responses, and exact tool invocation inputs/outputs.

---


## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI, Python 3.11+ |
| **Agentic State Machine** | LangGraph, LangChain Core |
| **Observability & Tracing** | LangSmith |
| **Database & Persistence** | SQLite (WAL mode, index-optimized) |
| **Media Extraction** | Whisper-large-v3, pypdf |
| **Export Engines** | python-pptx, reportlab |
| **Frontend UI** | Vanilla ES6+ JS, CSS3 Custom Variables (Warm Terracotta Theme) |
| **Libraries** | Lucide Icons, Marked.js (Markdown), Chart.js |

---

## 📂 Project Structure

```bash
├── asset_export.py     # Download helpers, PowerPoint PPTX & PDF poster compilers
├── config.py           # Central Settings class and environment configuration
├── cli.py              # Terminal CLI client for local debugging
├── Dockerfile          # Containerization template
├── graph.py            # LangGraph state machine flow setup
├── logger.py           # Custom formatted console/file logging
├── main.py             # FastAPI App (endpoints, JWT authentication, SSE stream)
├── nodes.py            # Graph nodes logic & SYSTEM_PROMPT definitions
├── readme.md           # Project documentation (this file)
├── requirements.txt    # Python package dependencies
├── state.py            # TypedDict definition of the chat state
├── tools.py            # Custom tools: RAG retriever, SCADA status, calculator
└── static/             # Frontend web assets
    ├── index.html      # Main single-page application UI
    └── uploads/        # Uploaded images, audio, and documents
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the root directory to configure the application:

```ini
# LLM & API Keys
GROQ_API_KEY="gsk_..."
BACKUP_GROQ_API_KEY="gsk_..."  # Optional, rotated automatically on rate limits
REPLICATE_API_TOKEN="r8_..."   # Optional, required for video generation

# LangSmith Tracing (Observability)
LANGCHAIN_TRACING_V2="true"
LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
LANGCHAIN_API_KEY="lsv2_pt_..."
LANGCHAIN_PROJECT="multilingualchat"

# Database Path
SQLITE_DB_PATH="chatbot_memory.db"

# Compression Settings
MAX_MESSAGES_BEFORE_SUMMARY=12
KEEP_LAST_N_AFTER_SUMMARY=4

```

---

## 🚀 Running the Application

### Option A: Running with Docker (Recommended)

1. **Build the Docker Image:**
   ```bash
   docker build -t multitask-chatbot .
   ```

2. **Run the Container:**
   ```bash
   docker run -d -p 8000:8000 --name multitask-chatbot --env-file .env multitask-chatbot
   ```

3. **Access the Portal:**
   Open [http://localhost:8000](http://localhost:8000) in your web browser.

### Option B: Running Locally

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

---

## 📝 CLI Mode (For Local Terminal Debugging)

To test the chatbot state machine directly from the command line without the web portal:
```bash
python cli.py --thread my-debug-session
```
*Note: Threads are persisted in SQLite, allowing you to resume terminal sessions later.*