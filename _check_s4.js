const fs = require('fs');
const html = fs.readFileSync('static/index.html', 'utf8');
const scripts = [];
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  scripts.push(match[1]);
}
const s4 = scripts[4];
fs.writeFileSync('_s4.js', s4, 'utf8');

// Use node syntax parser via babel or acorn or esprima if available, or binary search
const lines = s4.split('\n');
console.log('Total lines in s4:', lines.length);

// Let's find what function or block is opened but not closed by parsing AST or testing chunks
let stack = [];
for (let lineNum = 0; lineNum < lines.length; lineNum++) {
  const line = lines[lineNum];
  // Simple scan
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '{') stack.push({ type: '{', line: lineNum + 1 });
    if (ch === '}') {
      if (stack.length > 0 && stack[stack.length - 1].type === '{') {
        stack.pop();
      } else {
        console.log('Extra } at line', lineNum + 1);
      }
    }
  }
}
console.log('Unmatched { count:', stack.length);
stack.forEach(s => console.log('Unmatched { at line:', s.line, lines[s.line - 1].trim()));
