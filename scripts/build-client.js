#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Get base URL from env
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL || '';

// Only replace if baseUrl is set and NOT vercount.one
const shouldReplace = baseUrl && !baseUrl.includes('vercount.one');

const clientSrc = path.resolve(__dirname, '../src/lib/client.js');
const clientTmp = path.resolve(__dirname, '../src/lib/client.build.js');

if (shouldReplace) {
  let origin = baseUrl;
  try {
    origin = new URL(baseUrl).origin;
  } catch (e) {
    origin = baseUrl.replace(/\/$/, '');
  }

  console.log(`[build-client] Using custom domain: ${origin}`);

  // Create temporary build version of client.js
  let clientContent = fs.readFileSync(clientSrc, 'utf8');
  clientContent = clientContent.replace(/https:\/\/events\.vercount\.one/g, origin);
  fs.writeFileSync(clientTmp, clientContent, 'utf8');

  // Replace in usage.tsx
  const usagePath = path.resolve(__dirname, '../src/components/usage.tsx');
  const usageBackup = usagePath + '.backup';
  let usageContent = fs.readFileSync(usagePath, 'utf8');
  fs.writeFileSync(usageBackup, usageContent, 'utf8'); // backup
  usageContent = usageContent.replace(/https:\/\/events\.vercount\.one/g, origin);
  fs.writeFileSync(usagePath, usageContent, 'utf8');

  // Replace in layout.tsx
  const layoutPath = path.resolve(__dirname, '../src/app/layout.tsx');
  const layoutBackup = layoutPath + '.backup';
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  fs.writeFileSync(layoutBackup, layoutContent, 'utf8'); // backup
  layoutContent = layoutContent.replace(/https:\/\/vercount\.one/g, origin);
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
} else {
  console.log('[build-client] Using default: vercount.one');
  // Just copy original
  fs.copyFileSync(clientSrc, clientTmp);
}

