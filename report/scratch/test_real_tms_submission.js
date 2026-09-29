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

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const options = {
      hostname: TMS_HOST,
      port: TMS_PORT,
      path: path,
      method: method,
      headers: headers,
      timeout: 15000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', err => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Connection to Walton TMS at ${TMS_HOST} timed out`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testSubmit() {
  console.log('1. Logging in to Walton TMS...');
  const loginRes = await makeTmsRequest(`${TMS_BASE_PATH}/login.php`, 'POST', {
    user: '50463',
    password: 'Sep@2026',
    btn_login: 'Login'
  });

  const rawCookies = loginRes.headers['set-cookie'] || [];
  const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');
  console.log('Session Cookie:', cookie ? 'Obtained' : 'Failed');

  // Let's inspect the categories on the task add page to get the exact value for task_category
  const addPageRes = await makeTmsRequest(`${TMS_BASE_PATH}/index.php?m=task&&page=task&&lpage=task&a=addedit`, 'GET', null, cookie);
  const catMatches = addPageRes.body.match(/<select[^>]*name=["']task_category["'][^>]*>[\s\S]*?<\/select>/i);
  console.log('Category select options snippet:', catMatches ? catMatches[0].substring(0, 500) : 'none');

  // Also check supervisor options
  const supMatches = addPageRes.body.match(/<input[^>]*name=["']supervisor["'][^>]*>|<select[^>]*name=["']supervisor["'][^>]*>[\s\S]*?<\/select>/i);
  console.log('Supervisor element:', supMatches ? supMatches[0] : 'none');

  console.log('\n2. Submitting Task 6: For Foil Compressor Jacket New Die Setup for 18M...');
  const taskPayload = {
    task_status: '1',
    task_title: 'For Foil Compressor Jacket New Die Setup for 18M',
    task_details: '1. Technical requirement analysis & workstation preparation. 2. Die setup & trial for 18M compressor jacket foil. 3. Verification & handover.',
    assign_date: '2026-09-19 12:00:00',
    dead_line_date: '2026-09-27 12:00:00',
    total_days: '8',
    tpoint: '100',
    tpoint2: '0',
    emp_id: '44819',
    supervisor: '44819',
    supervisor_mobile: '01678028434',
    assign_employee: '50463',
    task_category: '8#sep#Process Optimization',
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

  console.log('Create Response Status:', createRes.statusCode);
  console.log('Create Response Location:', createRes.headers['location']);
  console.log('Create Response Body snippet:', createRes.body.substring(0, 500));

  let taskId = null;
  const loc = createRes.headers['location'];
  if (loc) {
    const m = loc.match(/code=(\d+)/i) || loc.match(/task_id=(\d+)/i);
    if (m) taskId = m[1];
  }
  if (!taskId && createRes.body) {
    const m = createRes.body.match(/code=(\d+)/i) || createRes.body.match(/task_id=(\d+)/i) || createRes.body.match(/Task ID #\s*(\d+)/i);
    if (m) taskId = m[1];
  }

  console.log('Extracted Task ID:', taskId);

  if (taskId) {
    console.log(`\n3. Marking Task #${taskId} 100% Complete...`);
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
    console.log('Status Update Location:', statusRes.headers['location']);
    console.log('Status Update Body snippet:', statusRes.body.substring(0, 300));
  }
}

testSubmit().catch(console.error);
