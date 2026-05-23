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
  const relativePath = path.relative(srcDir, file);
  const content = fs.readFileSync(file, 'utf8');
  
  // Find bg-white elements and check if they have dark:bg
  // Find bg-slate-50, bg-slate-100, bg-slate-200, bg-slate-300, bg-gray-50, bg-gray-100, bg-gray-200 etc. and check if they have dark:bg
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check if line contains className="..." or className={`...`}
    const classMatch = line.match(/className=(?:"([^"]+)"|`([^`]+)`|{`([^`]+)`})/);
    if (classMatch) {
      const classStr = classMatch[1] || classMatch[2] || classMatch[3] || "";
      const classes = classStr.split(/\s+/);
      
      // Let's analyze the classes
      const hasBgLight = classes.some(c => c.match(/^bg-(white|slate-(50|100|200)|gray-(50|100|200)|neutral-(50|100|200)|zinc-(50|100|200))/));
      const hasBgDark = classes.some(c => c.startsWith('dark:bg-'));
      
      const hasTextLight = classes.some(c => c.match(/^text-(slate|gray|zinc|neutral|slate)-(700|800|900)/));
      const hasTextDark = classes.some(c => c.startsWith('dark:text-'));
      
      const hasBorderLight = classes.some(c => c.match(/^border-(slate|gray|zinc|neutral)-(100|200|300)/));
      const hasBorderDark = classes.some(c => c.startsWith('dark:border-'));

      // If it's a bg-white card, check if it has a dark bg
      if (hasBgLight && !hasBgDark) {
        issues.push(`Line ${lineNum}: Card/box background has light bg but missing dark:bg-* variant. Classes: "${classStr}"`);
      }
      
      // If it's dark text, check if it has dark:text
      if (hasTextLight && !hasTextDark) {
        issues.push(`Line ${lineNum}: Text has light text color but missing dark:text-* variant. Classes: "${classStr}"`);
      }
      
      // If it has light border, check if it has dark:border
      if (hasBorderLight && !hasBorderDark) {
        issues.push(`Line ${lineNum}: Border has light border color but missing dark:border-* variant. Classes: "${classStr}"`);
      }
      
      // Also look for hardcoded black/white colors that don't transition
      // e.g. bg-white without dark:bg and text-black or text-slate-900
      if (classes.includes('bg-white') && !hasBgDark) {
        issues.push(`Line ${lineNum}: bg-white missing dark:bg-* variant. Classes: "${classStr}"`);
      }
      if (classes.includes('text-white') && classes.some(c => c.startsWith('bg-')) && !classes.some(c => c.startsWith('dark:bg-'))) {
        // text-white on a background that might turn white in light mode!
        // E.g., if there's no dark mode bg, the background defaults to white or slate-50, and text-white becomes invisible!
        issues.push(`Line ${lineNum}: text-white on background with no dark:bg variant. Classes: "${classStr}"`);
      }
      
      // Look for text-slate-800 or similar without dark:text variant
      if (classes.some(c => c.match(/^text-(slate|gray|zinc|neutral)-(700|800|900)$/)) && !hasTextDark) {
        issues.push(`Line ${lineNum}: Dark text color without dark:text-* variant. Classes: "${classStr}"`);
      }
    }
  });
  
  if (issues.length > 0) {
    console.log(`\n========================================`);
    console.log(`FILE: ${relativePath}`);
    console.log(`========================================`);
    // Unique list
    const unique = [...new Set(issues)];
    unique.forEach(issue => console.log(issue));
  }
});
