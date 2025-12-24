
# Solana KYC Compliance SDK

A Solana-native compliance and KYC enforcement SDK that enables token issuers and programs to **enforce regulatory rules on-chain** without storing sensitive personal data.

This project provides:
- On-chain programs for compliance enforcement
- An off-chain SDK for integration with KYC / AML providers
- Tooling for managing registries, attestations, and compliant transfers

> This SDK enforces **compliance decisions**, not identities.

---

## Why This Exists

Most KYC solutions stop at verification. This SDK goes further.

On Solana, tokens and programs can enforce rules at execution time. This project makes it possible to:
- Block transfers from non-verified wallets
- Enforce jurisdictional or risk-based rules
- Freeze or revoke access dynamically
- Integrate real-world KYC providers without exposing PII on-chain

Think of this as **compliance middleware for Solana programs**.

---

## High-Level Architecture

**On-chain**
- Compliance registry programs
- Transfer validation logic
- Attestation verification

**Off-chain**
- Risk scoring engines
- KYC provider adapters
- Attestation issuance

**SDK**
- TypeScript client for apps and services
- Helpers for registry management and enforcement checks

No personal data is stored on-chain.  
Only cryptographic attestations and enforcement state exist on Solana.

---

## What This Is *Not*

- ❌ A KYC provider
- ❌ A user identity system
- ❌ A wallet tracking service

This SDK assumes KYC happens elsewhere and focuses on **enforcing the outcome**.

---

## Quick Start

### Prerequisites

- Solana CLI
- Anchor
- Node.js (18+)
- Yarn or npm

### Install

```bash
git clone https://github.com/Gitdigital-products/solana-kyc-compliance-sdk.git
cd solana-kyc-compliance-sdk

Build Programs

anchor build

Run Tests

anchor test

Deploy to Devnet

anchor deploy --provider.cluster devnet

If a non-compliant transfer fails, congrats — enforcement is working.
Repository Structure
/programs        → On-chain Solana programs
/sdk             → TypeScript SDK
/examples        → Minimal integration examples
/tests           → Program and SDK tests
/docs            → Architecture and guides
/scripts         → Deployment and utilities

Documentation

Getting Started

Architecture Overview

SDK Usage
