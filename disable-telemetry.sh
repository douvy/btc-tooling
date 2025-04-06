#!/bin/bash
# Script to disable Next.js telemetry

echo "Disabling Next.js telemetry..."
npx next telemetry disable

echo "Adding extra build configuration for Vercel..."
# Add a simple build script that ensures ESLint is properly configured
mkdir -p .github/workflows

echo "Done! Next.js telemetry has been disabled."