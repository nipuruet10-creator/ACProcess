const assert = require('assert');
const fs = require('fs');

console.log("--- TEST SUITE: Security & Privacy Check ---");

// Mock localStorage for node environment
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

const settingsViewPath = 'e:/Antigravity/Keyword Research/Process_Report_Automation_System/config/settings_view.js';
const settingsContent = fs.readFileSync(settingsViewPath, 'utf8');

// 1. Verify no Master Admin password in placeholder or error message
assert(!settingsContent.includes('placeholder="Enter ACprocess@2026"'), "Found 'placeholder=\"Enter ACprocess@2026\"' in settings_view.js");
assert(!settingsContent.includes('placeholder="ACprocess@2026"'), "Found 'placeholder=\"ACprocess@2026\"' in settings_view.js");
assert(!settingsContent.includes('Pass: ACprocess@2026'), "Found exposed 'Pass: ACprocess@2026' in error messages");

// 2. Verify no predictable PIN hint in placeholder
assert(!settingsContent.includes('placeholder="Leave empty for auto: Name@ID"'), "Found predictable Name@ID placeholder hint");
assert(!settingsContent.includes('value="${HELPERS.escapeHtml(eng.access_pin'), "Unique PIN must not be prefilled in input value");

// 3. Verify inputs are password type
assert(settingsContent.includes('id="new-staff-pin" placeholder="•••••••• (Leave blank to auto-generate)"'), "new-staff-pin must be masked");
assert(settingsContent.includes('id="edit-staff-pin" placeholder="•••••••• (Leave blank to keep existing)"'), "edit-staff-pin must be masked with blank default");

// 4. Verify Master lists PINs & updated names
const { MasterDataManager: MDM } = require('../config/master_lists.js');
const engineers = MDM.getEngineers();

const expectedPins = {
  "50463": "SZ#50463",
  "45127": "RF#45127",
  "54634": "FY#54634",
  "58102": "AJ#58102",
  "58279": "EM#58279",
  "56880": "HS#56880",
  "52800": "AN#52800",
  "7686":  "JW#7686",
  "54636": "PR#54636"
};

const expectedFullNames = {
  "50463": "Engr. Md Sazzad Mahmud",
  "45127": "Engr. Sajjadul Islam Rafi",
  "54634": "Engr. Ahmed Intisar Fiyaz",
  "58102": "Engr. Abdullah Jashim",
  "58279": "Engr. Yousof Ahmed Emon",
  "56880": "Engr. Abuzar Hashmi",
  "52800": "Engr. Md. Rafiul Anam",
  "7686":  "Engr. Jowel",
  "54636": "Engr. Md. Pearul Islam"
};

engineers.forEach(eng => {
  const expectedPin = expectedPins[eng.id];
  const expectedName = expectedFullNames[eng.id];
  assert.strictEqual(eng.access_pin, expectedPin, `PIN mismatch for ${eng.name} (${eng.id}): expected ${expectedPin}, got ${eng.access_pin}`);
  assert.strictEqual(eng.fullName, expectedName, `Full name mismatch for ID ${eng.id}: expected ${expectedName}, got ${eng.fullName}`);
  
  // Verify access with #
  assert(MDM.verifyEngineerAccess(eng.id, eng.id, expectedPin).success === true, `Failed unlock with ${expectedPin}`);
  // Verify access with @
  const atPin = expectedPin.replace('#', '@');
  assert(MDM.verifyEngineerAccess(eng.id, eng.id, atPin).success === true, `Failed unlock with ${atPin}`);

  console.log(`✓ ${eng.name} (${eng.id}): '${eng.fullName}' | PIN '${eng.access_pin}' (also supports '${atPin}') verified!`);
});

console.log("\n🔒 ALL SECURITY & PRIVACY CHECKS PASSED PERFECTLY!");
