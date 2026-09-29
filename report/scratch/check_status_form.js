const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({ user: '50463', password: 'Sep@2026', btn_login: 'Login' });
const req = http.request({
  hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/login.php', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  http.get({
    hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/index.php?m=task&&page=task_status&a=addedit&&lpage=&&task_types=&&task_id=104183',
    headers: { 'Cookie': cookie }
  }, (res2) => {
    let body = '';
    res2.on('data', c => body += c);
    res2.on('end', () => {
      console.log('Status form page length:', body.length);
      const inputs = body.match(/<(?:input|select|textarea)[^>]*name=["'][^"']+["'][^>]*>/gi) || [];
      console.log('Inputs on status update page:');
      inputs.forEach(i => console.log(i.trim()));
      const formTag = body.match(/<form[^>]*>/gi);
      console.log('Form tags on status page:', formTag);
    });
  });
});
req.write(postData);
req.end();
