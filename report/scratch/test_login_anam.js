const http = require('http');
const querystring = require('querystring');
const postData = querystring.stringify({ user: '52800', password: 'Sep@2026', btn_login: 'Login' });
const req = http.request({
  hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/login.php', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  console.log('StatusCode:', res.statusCode);
  console.log('Location:', res.headers.location);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Includes login.php:', body.includes('login.php'));
    const m = body.match(/<[^>]+style=["'][^"']*color:\s*red[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/i);
    if (m) console.log('Red error message:', m[0]);
    const alerts = body.match(/class=["']alert[\s\S]*?<\/div>/i);
    if (alerts) console.log('Alert:', alerts[0]);
  });
});
req.write(postData);
req.end();
