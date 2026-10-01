const fs = require('fs');
const path = require('path');

const srcBase = 'E:/Antigravity/Keyword Research/AC_Process_Master_Suite/report';
const dest1Base = 'E:/Antigravity/Keyword Research/Process_Report_Automation_System';
const dest2Base = 'E:/Antigravity/Keyword Research/1_UPLOAD_TO_GITHUB_Only_Updated_Files/report';

const files = [
  'index.html',
  'photos/photo_manager.js',
  'report/monthly_report_view.js',
  'slides/slide_layout_engine.js',
  'export/pptx_generator.js',
  'export/html_generator.js',
  'tasks/month_workbook_manager.js'
];

for (const rel of files) {
  const src = path.join(srcBase, rel);
  const d1 = path.join(dest1Base, rel);
  const d2 = path.join(dest2Base, rel);

  fs.mkdirSync(path.dirname(d1), { recursive: true });
  fs.copyFileSync(src, d1);

  fs.mkdirSync(path.dirname(d2), { recursive: true });
  fs.copyFileSync(src, d2);

  console.log(`Mirrored ${rel}`);
}

console.log('All files mirrored successfully!');
