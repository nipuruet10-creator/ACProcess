const fs = require('fs');
const assert = require('assert');

// Setup mock window & document DOM for Node.js testing
global.window = {
  appState: {
    workbookMgr: {
      activeMonth: 'SEP-2026',
      tasks: {
        'SEP-2026': [
          {
            task_id: 'TEST-16-VACUUM',
            task_name: '24XH0908FA Model vacuum farest point Vacuum check test',
            assignee: 'Anam (52800)',
            engineer: 'Anam (52800)',
            supervisor: 'Kamrul (44819)',
            category: 'Process development',
            points: 60
          }
        ]
      },
      getTask(month, id) {
        return this.tasks[month].find(t => t.task_id === id);
      },
      updateTask(month, id, patch) {
        const t = this.getTask(month, id);
        if (t) Object.assign(t, patch);
      }
    }
  }
};

global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; }
};

global.HELPERS = {
  escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

// Document mock
const elements = {};
global.document = {
  getElementById(id) {
    if (!elements[id]) {
      elements[id] = { id: id, innerHTML: '', value: '', type: '', style: {} };
    }
    return elements[id];
  },
  createElement(tag) {
    return { innerHTML: '', id: '', style: {} };
  },
  body: {
    appendChild(el) {
      if (el && el.id) elements[el.id] = el;
    }
  }
};

// Load modules
const { MASTER_LISTS, MasterDataManager } = require('../config/master_lists.js');
global.MASTER_LISTS = MASTER_LISTS;
global.MasterDataManager = MasterDataManager;
const TmsSyncService = require('../tasks/tms_sync_service.js');

console.log('=== TEST 1: Open TMS Confirm Modal ===');
TmsSyncService.openTmsConfirmModal('SEP-2026', 'TEST-16-VACUUM');
const confirmHtml = document.getElementById('tms-confirm-modal-container').innerHTML;
assert.ok(confirmHtml.includes('Walton TMS Submission Confirmation'), 'Modal must have confirmation title');
assert.ok(confirmHtml.includes('24XH0908FA Model vacuum farest point Vacuum check test'), 'Modal must show task name');
assert.ok(confirmHtml.includes('52800'), 'Modal must show Anam Employee ID 52800');
assert.ok(confirmHtml.includes('tms-confirm-password'), 'Modal must have editable password field');
assert.ok(confirmHtml.includes('tms-save-password-chk'), 'Modal must have save password checkbox');
assert.ok(confirmHtml.includes('Confirm &amp; Submit 100%'), 'Modal must have confirm button');
console.log('✔ TEST 1 PASSED: Confirm modal renders task details and editable password');

console.log('\n=== TEST 2: Open Password Warning Modal ===');
TmsSyncService.openTmsPasswordWarningModal('SEP-2026', 'TEST-16-VACUUM', '52800', 'Anam (52800)', 'Invalid Walton TMS password for Employee ID: 52800');
const warningHtml = document.getElementById('tms-warning-modal-container').innerHTML;
assert.ok(warningHtml.includes('Walton TMS Password Rejected'), 'Must have rejected password title');
assert.ok(warningHtml.includes('Anam (52800)'), 'Must mention Anam');
assert.ok(warningHtml.includes('tms-retry-password-input'), 'Must have retry password input');
assert.ok(warningHtml.includes('Retry Submission'), 'Must have retry button');
console.log('✔ TEST 2 PASSED: Warning modal renders proper error guidance for Anam');

console.log('\n=== TEST 3: Badge Rendering and Options Menu ===');
const badgeHtml = TmsSyncService.renderTmsBadgeHtml({
  task_id: 'TEST-16-VACUUM',
  tms_task_id: '104892'
});
assert.ok(badgeHtml.includes('#104892'), 'Badge must render ID 104892');
assert.ok(badgeHtml.includes('⚙️'), 'Badge must render options gear button');
assert.ok(badgeHtml.includes('openTmsActionsMenu'), 'Gear must trigger openTmsActionsMenu');

TmsSyncService.openTmsActionsMenu(null, 'SEP-2026', 'TEST-16-VACUUM', '104892');
const actionsHtml = document.getElementById('tms-actions-modal-container').innerHTML;
assert.ok(actionsHtml.includes('Re-Submit / Switch Engineer'), 'Menu must allow re-submitting');
assert.ok(actionsHtml.includes('Unlink TMS ID from this row'), 'Menu must allow unlinking');
console.log('✔ TEST 3 PASSED: Badge includes gear options menu for re-submitting / unlinking');

console.log('\n=== TEST 4: MasterDataManager Credential Storage ===');
MasterDataManager.updateTmsPassword('52800', 'CustomAnamPass@2026');
const creds = MasterDataManager.getEngineerCredentials('52800');
assert.strictEqual(creds.password, 'CustomAnamPass@2026', 'Must persist updated password');
console.log('✔ TEST 4 PASSED: MasterDataManager saves and retrieves engineer TMS passwords');

console.log('\n=== ALL USER FIXES VERIFIED SUCCESSFULLY! 🚀 ===');
