const fs = require('fs');
const path = require('path');

const srcBase = 'E:/Antigravity/Keyword Research/AC_Process_Master_Suite/report';
const dest1Base = 'E:/Antigravity/Keyword Research/Process_Report_Automation_System';
const dest2Base = 'E:/Antigravity/Keyword Research/1_UPLOAD_TO_GITHUB_Only_Updated_Files/report';

const files = [
  'index.html',
  'api/delete_photo.php',
  'api/get_photos.php',
  'api/save_photo.php',
  'api/sync_top_works.php',
  'api/sync_overrides.php',
  'ai/prompt_templates.js',
  'database/firebase_sync_service.js',
  'photos/photo_manager.js',
  'photos/storage_provider.js',
  'report/monthly_report_view.js',
  'report/preview_modal.js',
  'report/top_works_manager.js',
  'report/final_editor_view.js',
  'slides/slide_layout_engine.js',
  'export/pptx_generator.js',
  'export/pdf_generator.js',
  'export/html_generator.js',
  'projects/projects_view.js',
  'dashboard/workshop_cost_manager.js',
  'dashboard/cost_savings_view.js',
  'export/export_controller.js',
  'report/builder_view.js',
  'management/mgmt_report_view.js',
  'tasks/monthly_input_view.js',
  'dashboard/cost_saving_tracker.js',
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

// Also mirror uploads/photos
const photosDir = path.join(srcBase, 'uploads', 'photos', 'SEP-2026');
if (fs.existsSync(photosDir)) {
  const pFiles = fs.readdirSync(photosDir);
  for (const pf of pFiles) {
    const pSrc = path.join(photosDir, pf);
    const pd1 = path.join(dest1Base, 'uploads', 'photos', 'SEP-2026', pf);
    const pd2 = path.join(dest2Base, 'uploads', 'photos', 'SEP-2026', pf);
    fs.mkdirSync(path.dirname(pd1), { recursive: true });
    fs.copyFileSync(pSrc, pd1);
    fs.mkdirSync(path.dirname(pd2), { recursive: true });
    fs.copyFileSync(pSrc, pd2);
    console.log(`Mirrored photo uploads/photos/SEP-2026/${pf}`);
  }
}

// Mirror photos_SEP-2026.json
const jsonCatalog = path.join(srcBase, 'uploads', 'photos_SEP-2026.json');
if (fs.existsSync(jsonCatalog)) {
  fs.copyFileSync(jsonCatalog, path.join(dest1Base, 'uploads', 'photos_SEP-2026.json'));
  fs.copyFileSync(jsonCatalog, path.join(dest2Base, 'uploads', 'photos_SEP-2026.json'));
  console.log('Mirrored photos_SEP-2026.json');
}

console.log('All files mirrored successfully!');
