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
    } else if (filePath.endsWith('.jsx')) {
      files.push(filePath);
    }
  }
  return files;
}

const files = getFiles(srcDir);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '..'), file);
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    if (line.includes('text-green-600') && !line.includes('dark:text-green-400')) {
      console.log(`${relPath} Line ${lineNum}: "${line.trim()}"`);
    }
  });
});
