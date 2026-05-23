const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Reports.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('text-') || line.includes('bg-') || line.includes('border-')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
