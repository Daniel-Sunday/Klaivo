const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  // backgrounds
  [ /bg-\[\#0A0A0F\]/gi, 'bg-bg-primary' ],
  [ /bg-\[\#16161F\]/gi, 'bg-bg-secondary' ],
  [ /bg-\[\#1A1A24\]/gi, 'bg-bg-secondary' ],
  [ /bg-\[\#1B1B20\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1b1b20\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1B1B22\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1b1b22\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1D1D26\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1d1d26\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#252530\]/gi, 'bg-surface-mid' ],
  [ /bg-\[\#35343a\]/gi, 'bg-surface-high' ],
  [ /bg-\[\#353440\]/gi, 'bg-surface-high' ],
  [ /bg-\[\#13131F\]/gi, 'bg-surface' ],
  [ /bg-\[\#131318\]/gi, 'bg-surface' ],
  [ /bg-\[\#1C1C24\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1c1c24\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1C1C26\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1c1c26\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1E1E28\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#1e1e28\]/gi, 'bg-surface-low' ],
  [ /bg-\[\#4F8EF7\]/gi, 'bg-accent' ],
  [ /bg-\[\#4f8ef7\]/gi, 'bg-accent' ],
  [ /bg-\[\#30D158\]/gi, 'bg-success' ],
  [ /bg-\[\#30d158\]/gi, 'bg-success' ],
  [ /bg-\[\#FF453A\]/gi, 'bg-danger' ],
  [ /bg-\[\#ff453a\]/gi, 'bg-danger' ],
  [ /bg-\[\#F0F0F5\]/gi, 'bg-text-primary' ],
  [ /bg-\[\#f0f0f5\]/gi, 'bg-text-primary' ],
  [ /bg-\[\#6B6B80\]/gi, 'bg-text-secondary' ],
  [ /bg-\[\#6b6b80\]/gi, 'bg-text-secondary' ],

  // text colors
  [ /text-\[\#F0F0F5\]/gi, 'text-text-primary' ],
  [ /text-\[\#e4e1e9\]/gi, 'text-text-body' ],
  [ /text-\[\#CACAD5\]/gi, 'text-text-body' ],
  [ /text-\[\#6B6B80\]/gi, 'text-text-secondary' ],
  [ /text-\[\#4F8EF7\]/gi, 'text-accent' ],
  [ /text-\[\#FF453A\]/gi, 'text-danger' ],
  [ /text-\[\#30D158\]/gi, 'text-success' ],

  // selections and focus
  [ /selection:bg-\[\#508ff8\]/gi, 'selection:bg-accent' ],
  [ /focus-within:border-\[\#508ff8\]/gi, 'focus-within:border-accent' ],
  [ /focus:border-\[\#4F8EF7\]/gi, 'focus:border-accent' ],
  
  // borders
  [ /border-\[\#4F8EF7\]/gi, 'border-accent' ],
  [ /border-\[\#30D158\]/gi, 'border-success' ],
  [ /border-\[\#FF453A\]/gi, 'border-danger' ],
  [ /border-white\/5/gi, 'border-border-subtle' ],
  [ /border-white\/\[0\.06\]/gi, 'border-ghost-border' ],
  [ /border-white\/\[0\.04\]/gi, 'border-ghost-border' ],
  [ /border-white\/\[0\.08\]/gi, 'border-ghost-border' ],
  [ /hover:border-white\/10/gi, 'hover:border-ghost-border' ],

  // inline styles
  [ /background:\s*'\#0A0A0F'/gi, "background: 'var(--bg-primary)'" ],
  [ /background:\s*'\#16161F'/gi, "background: 'var(--bg-secondary)'" ],
  [ /background:\s*'\#131318'/gi, "background: 'var(--surface)'" ],
  [ /background:\s*'\#13131F'/gi, "background: 'var(--surface)'" ],
  [ /background:\s*'\#1b1b20'/gi, "background: 'var(--surface-low)'" ],
  [ /background:\s*'rgba\(79,142,247,0\.08\)'/gi, "background: 'var(--accent-glow)'" ],
  [ /background:\s*'rgba\(79,142,247,0\.10\)'/gi, "background: 'var(--accent-subtle)'" ],
  [ /borderColor:\s*'rgba\(79,142,247,0\.30\)'/gi, "borderColor: 'var(--accent-border)'" ],
  [ /color:\s*'\#4F8EF7'/gi, "color: 'var(--accent)'" ]
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const targetDir = path.join(__dirname, '..', 'src');
console.log('Replacing hex colors in:', targetDir);

walkDir(targetDir, (filePath) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.css')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (let [regex, replacement] of REPLACEMENTS) {
    content = content.replace(regex, replacement);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', path.relative(targetDir, filePath));
  }
});

console.log('Replacement finished!');
