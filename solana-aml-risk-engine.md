# architect solana-aml-risk-engine

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      AML Risk Engine                                 │
│                                                                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────────────┐  │
│  │  Screening   │  │  Risk Scoring   │  │   Anchor Program      │  │
│  │  Providers   │  │  Orchestrator   │  │   (On-chain State)    │  │
│  │  (External)  │  │  (Off-chain TS) │  │                       │  │
│  └──────┬───────┘  └────────┬────────┘  └──────────┬────────────┘  │
│         │                   │                       │               │
│         └───────────────────▼───────────────────────▼               │
│                    ┌─────────────────────────────────┐              │
│                    │        PDA Accounts             │              │
│                    │  - RiskEngineConfig             │              │
│                    │  - SubjectRiskProfile           │              │
│                    │  - ScreeningRecord              │              │
│                    │  - TransactionRiskRecord        │              │
│                    │  - SanctionsListRecord          │              │
│                    │  - AlertRecord                  │              │
│                    │  - CaseRecord                   │              │
│                    └─────────────────────────────────┘              │
│                                    │                                │
│           ┌────────────────────────┼────────────────────┐          │
│           ▼                        ▼                    ▼           │
│  ┌──────────────┐      ┌─────────────────┐   ┌──────────────────┐  │
│  │  Rule Engine │      │  Alert Manager  │   │  Case Management │  │
│  │  (Off-chain) │      │  (Off-chain)    │   │  (Off-chain)     │  │
│  └──────────────┘      └─────────────────┘   └──────────────────┘  │
│           │                        │                    │           │
│           └────────────────────────▼────────────────────┘          │
│                          ┌──────────────────┐                       │
│                          │  SQL Indexer +   │                       │
│                          │  Event Bus       │                       │
│                          └──────────────────┘                       │
└──────────────────────────────────────────────────────────────────────┘
```