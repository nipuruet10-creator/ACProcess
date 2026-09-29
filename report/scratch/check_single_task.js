const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({ user: '50463', password: 'Sep@2026', btn_login: 'Login' });
const req = http.request({
  hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/login.php', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  http.get({
    hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/index.php?m=task&&page=single_task2&a=view&&code=104183',
    headers: { 'Cookie': cookie }
  }, (res2) => {
    let body = '';
    res2.on('data', c => body += c);
    res2.on('end', () => {
      console.log('Single task 104183 page length:', body.length);
      const links = body.match(/href=["'][^"']*status[^"']*["']/gi) || [];
      console.log('Status links:', links);
      const forms = body.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
      console.log('Forms on single task page:', forms.length);
      forms.forEach((f, idx) => console.log(`Form ${idx+1}:`, f.replace(/\s+/g, ' ').substring(0, 300)));
    });
  });
});
req.write(postData);
req.end();
