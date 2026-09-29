const fs = require('fs');
const vm = require('vm');

const masterCode = fs.readFileSync('config/master_lists.js', 'utf8');
const sandbox = {
  window: {},
  console: console,
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};
vm.createContext(sandbox);
vm.runInContext(masterCode + '\nthis.MasterDataManager = MasterDataManager;', sandbox);

const MDM = sandbox.MasterDataManager;
console.log('Engineers in system:', MDM.getEngineers().length);

const testSazzad = MDM.verifyEngineerAccess('50463', '50463', 'SZ#50463');
console.log('Sazzad PIN test:', testSazzad.success ? 'PASS' : 'FAIL');

const testRafi = MDM.verifyEngineerAccess('45127', '45127', 'RF#45127');
console.log('Rafi PIN test:', testRafi.success ? 'PASS' : 'FAIL');

const testAdmin = MDM.verifyEngineerAccess('45127', '50463', 'ACprocess@2026');
console.log('Master Admin override test:', testAdmin.success ? 'PASS' : 'FAIL');

const testWrong = MDM.verifyEngineerAccess('45127', '45127', 'WrongPass123');
console.log('Wrong PIN test rejected:', !testWrong.success ? 'PASS' : 'FAIL');
