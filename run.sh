#!/bin/bash
set -e

echo "🔧 Building program..."
anchor build

echo "🧪 Running tests..."
anchor test

echo "📦 Building TypeScript SDK..."
cd sdk
npm install
npm run build

echo "✅ Compliance SDK is live on localnet"