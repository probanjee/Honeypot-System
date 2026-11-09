import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const distViews = path.join(root, 'dist', 'views');
const srcViews = path.join(root, 'src', 'views');
if (fs.existsSync(srcViews)) {
  fs.cpSync(srcViews, distViews, { recursive: true });
  console.log('[BUILD] Copied src/views -> dist/views');
}

const distPublic = path.join(root, 'dist', 'public');
const srcPublic = path.join(root, 'src', 'public');
if (fs.existsSync(srcPublic)) {
  fs.cpSync(srcPublic, distPublic, { recursive: true });
  console.log('[BUILD] Copied src/public -> dist/public');
}

const rootPublic = path.join(root, 'public');
if (fs.existsSync(rootPublic)) {
  fs.cpSync(rootPublic, distPublic, { recursive: true });
  console.log('[BUILD] Copied public -> dist/public');
}

