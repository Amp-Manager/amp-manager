const fs = require('fs');
const path = require('path');

const extensions = ['.ts', '.tsx', '.json', '.md', '.bat', '.css', '.html'];
const excludeDirs = ['node_modules', 'dist', '.git', 'build', '.vscode', 'coverage', 'html'];
const root = process.cwd();

let converted = 0;
let skipped = 0;
let errors = 0;

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (excludeDirs.includes(file) || file.startsWith('.')) continue;
      walk(full);
      continue;
    }

    if (!extensions.some(ext => file.endsWith(ext))) continue;

    try {
      const buffer = fs.readFileSync(full);
      let hadBom = false;
      
      // --- 1. Remove BOM only (don't re-decode!) ---
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        const clean = buffer.slice(3);
        fs.writeFileSync(full, clean);
        console.log(`[OK] ${path.relative(root, full)} (BOM removed)`);
        converted++;
      } else {
        // No BOM - file is already clean UTF-8, skip it
        skipped++;
      }

    } catch (e) {
      console.log(`[ERR] ${file}: ${e.message}`);
      errors++;
    }
  }
}

console.log('Converting project files to UTF-8 (BOM removal only)...\n');
walk(root);
console.log(`\nDone. Converted: ${converted}, Skipped: ${skipped}, Errors: ${errors}`);
console.log('\nThis script is idempotent - running twice is safe.');
console.log('It only removes BOM if present, never re-encodes content.');