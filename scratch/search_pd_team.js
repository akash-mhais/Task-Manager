const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'ProjectDetail.jsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('Team Leader') || line.includes('Employee') || line.includes('department') || line.includes('bg-slate-950')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
