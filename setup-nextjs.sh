#!/bin/bash
# Script to set up a new Next.js project with TypeScript and Tailwind

# Create project directory
mkdir -p react-conversion

# Move to project directory
cd react-conversion

# Initialize Next.js project
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

# Install additional dependencies
npm install react-icons classnames

# Create project structure
mkdir -p src/components/layout
mkdir -p src/components/ui
mkdir -p src/components/bitcoin
mkdir -p public/fonts
mkdir -p public/images

echo "Next.js project setup complete!"