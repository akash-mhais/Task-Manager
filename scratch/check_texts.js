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
    if (line.includes('className=')) {
      const match = line.match(/className=(?:"([^"]+)"|`([^`]+)`|{`([^`]+)`})/);
      if (match) {
        const classStr = match[1] || match[2] || match[3] || "";
        const classes = classStr.split(/\s+/);
        
        classes.forEach(c => {
          if (c.match(/^text-(slate|gray|zinc|neutral)-(600|700|800|900)$/)) {
            const hasDarkText = classes.some(dc => dc.startsWith('dark:text-') || dc.startsWith('dark:hover:text-'));
            if (!hasDarkText) {
              console.log(`${relPath} Line ${lineNum}: missing dark:text for "${c}" in line: "${line.trim()}"`);
            }
          }
        });
      }
    }
  });
});
