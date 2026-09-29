const { execSync } = require('child_process');
const fs = require('fs');

try {
  let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
  }
  if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  console.log('Using browser:', browserPath);

  const testFile = 'file:///e:/Antigravity/Keyword%20Research/Process_Report_Automation_System/tests/run_tests.html';
  const out = execSync(`"${browserPath}" --headless --disable-gpu --dump-dom "${testFile}"`, { timeout: 20000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  
  const passed = (out.match(/\[PASS\]/g) || []).length;
  const failed = (out.match(/\[FAIL\]/g) || []).length;
  console.log('RESULTS -> PASSED:', passed, '| FAILED:', failed);
  
  if (failed > 0) {
    const lines = out.split('\n');
    lines.filter(l => l.includes('[FAIL]')).forEach(l => console.log('FAIL:', l.trim()));
  }
} catch (e) {
  console.error('Error running headless tests:', e.message);
}
