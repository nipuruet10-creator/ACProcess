const http = require('http');
const querystring = require('querystring');

const postData = querystring.stringify({ user: '50463', password: 'Sep@2026', btn_login: 'Login' });
const req = http.request({
  hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/login.php', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  const cookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  
  // 1. Fetch create task form
  http.get({
    hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/index.php?m=task&&page=task&&lpage=task&a=addedit',
    headers: { 'Cookie': cookie }
  }, (res2) => {
    let body = '';
    res2.on('data', c => body += c);
    res2.on('end', () => {
      console.log('--- CREATE TASK FORM INPUTS ---');
      const inputs = body.match(/<(?:input|select|textarea)[^>]*name=["'][^"']+["'][^>]*>/gi) || [];
      inputs.forEach(inp => console.log(inp.trim()));
      
      // 2. Fetch completed tasks page
      http.get({
        hostname: '192.168.118.138', port: 80, path: '/adm/repo1/mod/tms/index.php?m=task&&page=complete&&lpage=complete&a=view',
        headers: { 'Cookie': cookie }
      }, (res3) => {
        let body3 = '';
        res3.on('data', c => body3 += c);
        res3.on('end', () => {
          console.log('\n--- COMPLETED TASKS PAGE ---');
          const codeMatches = body3.match(/code=(\d+)/g) || [];
          console.log('Completed Task codes in TMS:', [...new Set(codeMatches)].slice(0, 10));
          // Let's see if 104867, 104868, etc. are here
          ['104867', '104868', '104869', '104870', '104871', '104872'].forEach(c => {
            console.log(`Task #${c} present in complete page:`, body3.includes(c));
          });
        });
      });
    });
  });
});
req.write(postData);
req.end();
