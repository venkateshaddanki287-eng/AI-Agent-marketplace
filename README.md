# 🤖 AI Agent Marketplace (x402 Micropayments)

An autonomous AI Agent Marketplace powered by the **Algorand Blockchain** using **HTTP 402 Payment Required** (`x402-avm`) protocol. 

This platform enables developers to list AI services, while autonomous orchestrators or human users discover services, execute micro-transactions instantly via Algorand Testnet, and consume AI capabilities seamlessly.

---

## 🌟 Key Features

- **🌐 Centralized Agent Registry & UI**: Browse, discover, register, and monitor registered AI agents via a web interface powered by Express and SQLite.
- **⚡ Algorand HTTP 402 Integration**: Instant, low-cost micro-payments using standard HTTP `402 Payment Required` headers (`@x402-avm`).
- **🤖 Autonomous Orchestrator CLI**: Smart CLI client that matches natural language user intent to registered agents, manages payment confirmation, auto-signs Algorand transactions, and executes tasks.
- **🛠️ Built-in AI Micro-services**:
  - **Text Summarizer Agent** (`http://localhost:5001/summarize`): Summarizes long text inputs.
  - **Translator Agent** (`http://localhost:5002/translate`): Translates text to target languages.

---

## 🏗️ System Architecture

```
+------------------+         1. Query Available Agents         +-------------------+
|                  | ----------------------------------------> |                   |
|   Orchestrator   |                                           |  Agent Registry   |
|      (CLI)       | <---------------------------------------- |    (Port 5000)    |
|                  |          2. Agent Metadata & Price        +-------------------+
+--------+---------+                                                     ^
         |                                                               |
         | 3. POST Request                                               | Task Status
         v                                                               | Updates
+------------------+     4. HTTP 402 (Payment Required)        +---------+---------+
|                  | ----------------------------------------> |                   |
|    AI Agent      |                                           |     SQLite DB     |
| (Summarizer/     | <---------------------------------------- |   (registry.db)   |
|   Translator)    |      5. Sign & Resubmit with Payment      +-------------------+
|                  | ---------------------------------------->
|                  | <----------------------------------------
|                  |          6. HTTP 200 OK + AI Result
+------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** v18+ 
- **npm** v9+
- Algorand Testnet accounts with testnet ALGO (for buyer and seller wallets).

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/venkateshaddanki287-eng/AI-Agent-marketplace.git
cd AI-Agent-marketplace
npm install
```

> **Note:** The `postinstall` script will automatically run `patch-x402.js` to ensure compatibility with `@x402-avm`.

### 2. Setup Wallets & Database

Generate or configure your wallets and initialize the SQLite database:

```bash
# Initialize the SQLite registry database
node setup.js
```

Ensure `buyer_wallet.json` and `seller_wallet.json` are properly configured with your Algorand account mnemonics.

### 3. Run the Services

#### Step 1: Start the Registry Server & Dashboard
```bash
node registry/index.js
```
- Registry API: `http://localhost:5000/agents`
- Dashboard UI: `http://localhost:5000`

#### Step 2: Start the AI Agents
In separate terminal windows, start the micro-service agents:

```bash
# Start Summarizer Agent (Port 5001)
node agents/summarizer.js

# Start Translator Agent (Port 5002)
node agents/translator.js
```

#### Step 3: Run the Orchestrator CLI
```bash
node orchestrator.js
```

---

## 🧪 Testing & Verification

Run the test suite to verify integration without running full servers:

```bash
# Test Agent Registry CRUD operations
node test_registry.js

# Test Summarizer core logic
node test_summarizer.js

# Test end-to-end x402 payment flow
node test_x402_integration.js
```

---

## 📡 API Endpoints Overview

| Service | Method | Endpoint | Description | Header Requirements |
| :--- | :--- | :--- | :--- | :--- |
| **Registry** | `GET` | `/agents` | List all registered agents | None |
| **Registry** | `POST` | `/agents` | Register a new AI agent | `Content-Type: application/json` |
| **Registry** | `GET` | `/tasks` | List task history | None |
| **Summarizer**| `POST` | `/summarize` | Summarize input text | `X-PAYMENT-SIGNATURE` (402 flow) |
| **Translator**| `POST` | `/translate` | Translate text | `X-PAYMENT-SIGNATURE` (402 flow) |

---

## 📜 License

Distributed under the **ISC License**. See `LICENSE` for details.
