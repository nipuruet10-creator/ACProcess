const fs = require('fs');
const vm = require('vm');

const masterCode = fs.readFileSync('config/master_lists.js', 'utf8');
const tmsCode = fs.readFileSync('tasks/tms_sync_service.js', 'utf8');

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    createElement: () => ({ id: '', innerHTML: '', appendChild: () => {} }),
    body: { appendChild: () => {} }
  },
  console: console,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};

vm.createContext(sandbox);
vm.runInContext(masterCode + '\nthis.MasterDataManager = MasterDataManager;', sandbox);
vm.runInContext(tmsCode + '\nthis.TmsSyncService = TmsSyncService;', sandbox);

const TSS = sandbox.TmsSyncService;

console.log('TmsSyncService loaded:', typeof TSS === 'object');
console.log('Cached password for Sazzad (50463):', TSS._getCachedTmsPassword('50463'));
console.log('Cached password for Rafi (45127):', TSS._getCachedTmsPassword('45127'));
console.log('openMasterPasswordUnlock function exists:', typeof TSS.openMasterPasswordUnlock === 'function');
console.log('unlockManualPass function exists:', typeof TSS.unlockManualPass === 'function');
