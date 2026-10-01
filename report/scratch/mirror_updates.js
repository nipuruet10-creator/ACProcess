const fs = require('fs');
const path = require('path');

const srcBase = 'E:/Antigravity/Keyword Research/AC_Process_Master_Suite/report';
const dest1Base = 'E:/Antigravity/Keyword Research/Process_Report_Automation_System';
const dest2Base = 'E:/Antigravity/Keyword Research/1_UPLOAD_TO_GITHUB_Only_Updated_Files/report';

const files = [
  'index.html',
  'api/delete_photo.php',
  'api/get_photos.php',
  'api/sync_top_works.php',
  'ai/prompt_templates.js',
  'database/firebase_sync_service.js',
  'photos/photo_manager.js',
  'report/monthly_report_view.js',
  'report/preview_modal.js',
  'report/top_works_manager.js',
  'report/final_editor_view.js',
  'slides/slide_layout_engine.js',
  'export/pptx_generator.js',
  'export/html_generator.js',
  'tasks/month_workbook_manager.js',
  'tasks/sync_engine.js',
  'app.js'
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
