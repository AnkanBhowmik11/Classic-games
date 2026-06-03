const fs = require('fs');
const buf = fs.readFileSync('old_index.html');
const text = buf.toString('utf16le');
const lines = text.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('<script src=')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
