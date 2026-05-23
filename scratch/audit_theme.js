const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frontend', 'src');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFiles(filePath, files);
    } else if (filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = getFiles(srcDir);
console.log(`Found ${files.length} files to audit.`);

const issues = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for theme visibility issues:
    // 1. Text color without dark: variant (e.g. text-slate-800 or text-gray-900 but no dark:text-)
    // We only care about main text colors like text-slate-800/700/900, text-gray-800/700/900, etc.
    const textColors = line.match(/text-(slate|gray|zinc|neutral)-(800|900|700|600)/g);
    if (textColors) {
      textColors.forEach(color => {
        if (!line.includes('dark:text-') && !line.includes('dark:hover:text-')) {
          // If it is inside a dark mode conditional block, or if the container itself has a hardcoded text color, or if it is inside comments
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            issues.push({
              file: path.relative(srcDir, file),
              lineNum,
              type: 'Missing dark:text-* variant',
              color,
              line: line.trim().substring(0, 120)
            });
          }
        }
      });
    }

    // 2. Background color without dark: variant (e.g. bg-white, bg-slate-50, bg-slate-100 without dark:bg-)
    const bgColors = line.match(/bg-(white|slate|gray|zinc|neutral)-(50|100|200)/g);
    if (bgColors) {
      bgColors.forEach(color => {
        if (!line.includes('dark:bg-') && !line.includes('dark:hover:bg-')) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            issues.push({
              file: path.relative(srcDir, file),
              lineNum,
              type: 'Missing dark:bg-* variant',
              color,
              line: line.trim().substring(0, 120)
            });
          }
        }
      });
    }
    
    // 3. Borders without dark mode border colors (e.g. border-slate-200, border-gray-200 without dark:border-)
    const borderColors = line.match(/border-(slate|gray|zinc|neutral)-(100|200|300)/g);
    if (borderColors) {
      borderColors.forEach(color => {
        if (!line.includes('dark:border-')) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            issues.push({
              file: path.relative(srcDir, file),
              lineNum,
              type: 'Missing dark:border-* variant',
              color,
              line: line.trim().substring(0, 120)
            });
          }
        }
      });
    }
  });
});

console.log(`Audited all files. Found ${issues.length} potential issues.`);
// Group by file
const grouped = {};
issues.forEach(issue => {
  if (!grouped[issue.file]) grouped[issue.file] = [];
  grouped[issue.file].push(issue);
});

Object.keys(grouped).forEach(file => {
  console.log(`\n--- File: ${file} (${grouped[file].length} issues) ---`);
  grouped[file].forEach(issue => {
    console.log(`Line ${issue.lineNum}: [${issue.type}] ${issue.color} in: "${issue.line}"`);
  });
});
