const http = require('http');
const querystring = require('querystring');

const TMS_HOST = '192.168.118.138';
const TMS_PORT = 80;
const TMS_BASE_PATH = '/adm/repo1/mod/tms';

function makeTmsRequest(path, method, data = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    let postData = null;
    if (data) {
      postData = typeof data === 'string' ? data : querystring.stringify(data);
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (cookie) headers['Cookie'] = cookie;
    const req = http.request({
      hostname: TMS_HOST, port: TMS_PORT, path: path, method: method, headers: headers, timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function testSubmitFaiyaz() {
  console.log('1. Logging in as Faiyaz (54634)...');
  const loginRes = await makeTmsRequest(`${TMS_BASE_PATH}/login.php`, 'POST', {
    user: '54634',
    password: '619684!Me',
    btn_login: 'Login'
  });
  const cookie = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  console.log('Faiyaz Cookie:', cookie ? 'Obtained' : 'Failed');

  console.log('2. Submitting Task 8: RAC Assembly line reclocation...');
  const taskPayload = {
    task_status: '1',
    task_title: 'RAC Assembly line reclocation',
    task_details: '1. Concept design & layout analysis for RAC Assembly line relocation. 2. Workstation preparation & installation. 3. Trial & production handover.',
    assign_date: '2026-09-19 12:00:00',
    dead_line_date: '2026-09-27 12:00:00',
    total_days: '8',
    tpoint: '50',
    tpoint2: '0',
    emp_id: '44819',
    supervisor: '44819',
    supervisor_mobile: '01678028434',
    assign_employee: '54634',
    task_category: '10#sep#Process Development',
    against_by: '',
    product_id: '1',
    task_mode: '0',
    tweight: '100',
    priority: 'STANDARD',
    any_note: '',
    task_type: '1',
    btn_insert: 'Create'
  };

  const createRes = await makeTmsRequest(
    `${TMS_BASE_PATH}/index.php?m=task&&page=task&&lpage=task&a=addedit`,
    'POST',
    taskPayload,
    cookie
  );

  let taskId = null;
  const loc = createRes.headers['location'];
  if (loc) {
    const m = loc.match(/code=(\d+)/i) || loc.match(/task_id=(\d+)/i);
    if (m) taskId = m[1];
  }
  console.log('Faiyaz Task ID:', taskId);

  if (taskId) {
    console.log(`3. Marking Task #${taskId} 100% Complete...`);
    const statusPayload = {
      status_type: 'complete',
      task_percentage: '100',
      any_note: 'completed',
      btn_insert: 'Insert'
    };
    const statusRes = await makeTmsRequest(
      `${TMS_BASE_PATH}/index.php?m=task&&page=task_status&a=addedit&task_id=${taskId}`,
      'POST',
      statusPayload,
      cookie
    );
    console.log('Status Update Status:', statusRes.statusCode);
  }
}

testSubmitFaiyaz().catch(console.error);
