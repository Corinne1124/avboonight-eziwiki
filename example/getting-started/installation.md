---
title: Installation
description: Detailed installation guide for eziwiki
order: 2
---

# Installation

![eziwiki](/images/eziwiki.webp)

This guide covers different ways to install and set up eziwiki.

## Method 1: `npx create-eziwiki` (recommended)

```bash
npx create-eziwiki my-docs
cd my-docs
npm install
npm run dev
```

This scaffolds a self-contained project with the engine, a config file, and two
starter pages. Nothing is linked back to the eziwiki repository — the result is
yours to edit freely.

The project name must be a valid npm package name: lowercase, no spaces. The
command refuses to write into a directory that already has files in it.

## Method 2: Clone the repository

Use this if you want the full demo content, or intend to modify the engine
itself:

```bash
git clone https://github.com/i3months/eziwiki.git
cd eziwiki
npm install
npm run dev
```

You will want to empty `content/` and rewrite `payload/config.ts` before
publishing, since both are this documentation site.

## Method 3: Use as a GitHub template

1. Open the [eziwiki repository](https://github.com/i3months/eziwiki)
2. Click **Use this template**
3. Clone your new repository, then install and run:

```bash
git clone https://github.com/yourusername/your-wiki.git
cd your-wiki
npm install
npm run dev
```

## System Requirements

- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher (or yarn 1.22+)
- **OS**: macOS, Windows, or Linux
- **RAM**: 2GB minimum
- **Disk Space**: 500MB for dependencies

## Verify Installation

After installation, verify everything works:

```bash
# Check Node.js version
node --version  # Should be 18.0 or higher

# Check npm version
npm --version   # Should be 9.0 or higher

# Run tests
npm run test

# Validate configuration
npm run validate:payload
```

## Project Structure

After installation, you'll have this structure:

```
eziwiki/
├── app/              # Next.js App Router
├── components/       # React components
├── content/          # Your Markdown files
├── lib/              # Utilities and logic
├── payload/          # Configuration
│   └── config.ts     # Main config file
├── public/           # Static assets
├── styles/           # Global styles
└── package.json      # Dependencies
```

## Troubleshooting

### Node.js Version Error

If you see a Node.js version error:

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18
nvm install 18
nvm use 18
```

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Module Not Found

If you see module errors:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- [Quick Start Guide](/getting-started/quick-start)
- [Create Your First Wiki](/getting-started/first-wiki)
- [Configure Your Wiki](/configuration/payload)
