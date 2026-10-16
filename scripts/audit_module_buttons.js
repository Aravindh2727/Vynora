const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../client/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx')).sort();

console.log('======================================================================');
console.log('   VYNORA — COMPREHENSIVE SECTION, SUBSECTION & CRUD BUTTON AUDIT     ');
console.log('======================================================================\n');

let totalIssues = 0;
const results = [];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');

  let fileIssues = 0;
  const issueDetails = [];

  // 1. Analyze Component Structure & Returns via Relative Scope Depth
  let braceDepth = 0;
  let componentBraceDepth = -1;
  let insideComponent = false;
  const componentReturns = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/export\s+(?:default\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/.test(line)) {
      componentBraceDepth = braceDepth;
      insideComponent = true;
    }

    // Check if line returns JSX (return ( or return <Tag), but NOT cleanup function return () =>
    if (insideComponent && /^\s*return\s*(\(|\<[A-Za-z])/.test(line) && !/^\s*return\s*\([^)]*\)\s*=>/.test(line)) {
      const relDepth = braceDepth - componentBraceDepth;
      const prevLine = lines.slice(Math.max(0, i - 2), i).join(' ');
      const isInsideHelper = /const\s+render\w+\s*=/.test(prevLine);
      const isLoadingReturn = /LoadingSpinner/.test(line);

      // Component-level return candidates (depth 1 or conditional drilldown at depth 2)
      if ((relDepth === 1 || relDepth === 2) && !isInsideHelper && !isLoadingReturn) {
        componentReturns.push({ lineNum: i + 1, relDepth, text: line.trim() });
      }
    }

    for (const char of line) {
      if (char === '{') braceDepth++;
      else if (char === '}') braceDepth--;
    }
  }

  // If there are multiple drilldown returns (like VehicleManager), verify modals are mounted in all
  if (componentReturns.length > 1) {
    const hasModalHoisting = code.includes('renderModals()') || code.includes('<ConfirmModal');
    if (!hasModalHoisting) {
      fileIssues++;
      issueDetails.push(`Multiple drilldown returns without hoisted modals at lines: ${componentReturns.map(r => r.lineNum).join(', ')}`);
    }
  }

  // 2. Check for Truly Dead / Empty Handlers (e.g. onClick={() => {}}, onClick={() => undefined})
  const deadHandlerRegex = /onClick\s*=\s*\{\s*(?:\(\s*\)\s*=>\s*\{\s*\}|\(\s*\)\s*=>\s*(?:undefined|null)|(?:undefined|null))\s*\}/g;
  let deadMatch;
  while ((deadMatch = deadHandlerRegex.exec(code)) !== null) {
    const lineNum = code.substring(0, deadMatch.index).split('\n').length;
    fileIssues++;
    issueDetails.push(`Truly dead onClick at line ${lineNum}: "${deadMatch[0]}"`);
  }

  // 3. Check all <button> elements for missing onClick/type=submit
  const buttonRegex = /<button\b([^>]*?)>/gs;
  let btnMatch;
  while ((btnMatch = buttonRegex.exec(code)) !== null) {
    const attrs = btnMatch[1];
    const hasOnClick = /onClick\s*=/.test(attrs);
    const isSubmit = /type\s*=\s*["']submit["']/.test(attrs);
    const hasForm = /form\s*=/.test(attrs);

    if (!hasOnClick && !isSubmit && !hasForm) {
      const lineNum = code.substring(0, btnMatch.index).split('\n').length;
      fileIssues++;
      issueDetails.push(`Button without onClick or type="submit" at line ${lineNum}`);
    }
  }

  // 4. Check all <form> elements for onSubmit
  const formRegex = /<form\b([^>]*?)>/gs;
  let formMatch;
  while ((formMatch = formRegex.exec(code)) !== null) {
    const attrs = formMatch[1];
    if (!/onSubmit\s*=/.test(attrs)) {
      const lineNum = code.substring(0, formMatch.index).split('\n').length;
      fileIssues++;
      issueDetails.push(`Form missing onSubmit at line ${lineNum}`);
    }
  }

  // 5. Check EmptyState actionText vs onAction
  const emptyStateRegex = /<EmptyState([^>]+)>/g;
  let esMatch;
  while ((esMatch = emptyStateRegex.exec(code)) !== null) {
    const props = esMatch[1];
    const hasActionText = /actionText=/.test(props);
    const hasOnAction = /onAction=/.test(props);
    if (hasActionText && !hasOnAction) {
      const lineNum = code.substring(0, esMatch.index).split('\n').length;
      fileIssues++;
      issueDetails.push(`EmptyState has actionText but missing onAction at line ${lineNum}`);
    }
  }

  // 6. Check Modal states have both openers and closers
  const modalStateRegex = /const\s+\[(show[A-Za-z0-9_]*Modal|is[A-Za-z0-9_]*Open),\s*(set[A-Za-z0-9_]+)\]\s*=\s*useState\((false|true)\)/g;
  let msMatch;
  while ((msMatch = modalStateRegex.exec(code)) !== null) {
    const stateName = msMatch[1];
    const setterName = msMatch[2];
    const hasOpener = new RegExp(`${setterName}\\(true\\)`).test(code);
    const hasCloser = new RegExp(`${setterName}\\(false\\)`).test(code);

    if (!hasOpener) {
      fileIssues++;
      issueDetails.push(`Modal state "${stateName}" has no ${setterName}(true) opener`);
    }
    if (!hasCloser) {
      fileIssues++;
      issueDetails.push(`Modal state "${stateName}" has no ${setterName}(false) closer`);
    }
  }

  totalIssues += fileIssues;
  const status = fileIssues === 0 ? 'PASS' : 'FAIL';
  results.push({ file, status, issues: fileIssues, details: issueDetails });

  console.log(`[${status}] ${file} — ${fileIssues === 0 ? 'All buttons, forms, modals & returns verified' : `${fileIssues} issues detected`}`);
  if (issueDetails.length > 0) {
    issueDetails.forEach(d => console.log(`       -> ${d}`));
  }
});

console.log('\n======================================================================');
console.log(`AUDIT COMPLETE: ${totalIssues === 0 ? 'ALL MODULES PASSED (0 DEFECTS)' : `${totalIssues} TOTAL DEFECTS FOUND`}`);
console.log('======================================================================');

if (totalIssues > 0) {
  process.exit(1);
}
