const fs = require('fs');
const p = 'c:\\xampp\\htdocs\\launchpad\\frontend\\src\\components\\dashboard\\LaunchpadWebMcpTestPanel.tsx';
let c = fs.readFileSync(p, 'utf8');
let lines = c.split('\n');
console.log('Total lines:', lines.length);
console.log('--- Last 15 lines ---');
for (let i = Math.max(0, lines.length - 15); i < lines.length; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(lines[i]));
}
console.log('--- Searching for key sections ---');
console.log('Has statusIcon:', c.includes('const statusIcon'));
console.log('Has executionIcon:', c.includes('const executionIcon'));
console.log('Has DECLARATIVE_TOOL_NAME:', c.includes('DECLARATIVE_TOOL_NAME'));
console.log('Has data-toolname:', c.includes('data-toolname'));
console.log('Has Right column:', c.includes('Right column'));
console.log('Has Declarative Tool Form:', c.includes('Declarative Tool Form'));
console.log('Has export default:', c.includes('export default function'));

const fs = require('fs');
const p = 'c:\\xampp\\htdocs\\launchpad\\frontend\\src\\components\\dashboard\\LaunchpadWebMcpTestPanel.tsx';
let c = fs.readFileSync(p, 'utf8');
console.log('Length:', c.length);
console.log('Last 200 chars:', JSON.stringify(c.slice(-200)));
