const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({ user: '50463', password: 'Sep@2026', btn_login: 'Login' });
const req = http.request({
  hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/login.php', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  http.get({
    hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/index.php?m=task&&page=task&&lpage=task&a=addedit',
    headers: { 'Cookie': cookie }
  }, (res2) => {
    let body = '';
    res2.on('data', c => body += c);
    res2.on('end', () => {
      const formTag = body.match(/<form[^>]*>/gi);
      console.log('Form tags:', formTag);
    });
  });
});
req.write(postData);
req.end();
