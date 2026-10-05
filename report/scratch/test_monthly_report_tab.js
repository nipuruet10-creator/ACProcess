const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = 'e:/Antigravity/Keyword Research/AC_Process_Master_Suite';
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/report' || reqPath === '/report/') reqPath = '/report/index.html';
  const filePath = path.join(rootDir, reqPath.replace(/^\//, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('404');
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'text/plain' });
      res.end(data);
    }
  });
});

server.listen(8786, async () => {
  const edgeProc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9351',
    'http://localhost:8786/report/index.html#monthly-report'
  ]);

  await new Promise(r => setTimeout(r, 3000));
  const tabs = await (await fetch('http://127.0.0.1:9351/json')).json();
  const tab = tabs.find(t => t.url.includes('8786'));
  if (!tab) { edgeProc.kill(); server.close(); process.exit(1); }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let evalCount = 0;

  ws.onopen = () => {
    const interval = setInterval(async () => {
      evalCount++;
      const id = evalCount;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          const val = msg.result?.result?.value;
          if (val && val.hasAppState && val.htmlLength > 0) {
            clearInterval(interval);
            console.log('\n=============================================');
            console.log('LIVE HEADLESS EDGE MONTHLY-REPORT RESULT (SUCCESS):');
            console.log('=============================================');
            console.log(JSON.stringify(val, null, 2));
            edgeProc.kill();
            server.close();
            process.exit(0);
          } else {
            console.log('Polling monthly-report... appState:', Boolean(val?.hasAppState), 'htmlLen:', val?.htmlLength);
          }
        }
      };
      ws.addEventListener('message', handler);

      const expr = `
        (function() {
          var repCont = document.getElementById('monthly-report-view-container');
          var html = repCont ? repCont.innerHTML : '';
          var activeSlides = (window.appState && window.appState.syncEngine) ? window.appState.syncEngine.getActiveSlides('SEP-2026') : [];
          var engineers = ['Hashmi', 'Anam', 'Emon', 'Pear', 'Abdullah', 'Sazzad', 'Jowel', 'Rafi', 'Faiyaz'];
          var foundEngs = engineers.filter(function(e) { return html.indexOf(e) !== -1; });
          return {
            hasAppState: Boolean(window.appState),
            activeTab: window.appState ? window.appState.activeTab : null,
            repContVisible: repCont ? !repCont.classList.contains('hidden') : false,
            activeSlidesTotal: activeSlides.length,
            engineersInMonthlyReport: foundEngs,
            engineersCount: foundEngs.length,
            htmlLength: html.length
          };
        })()
      `;
      ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }));

      if (evalCount > 15) {
        clearInterval(interval);
        console.log('Timeout polling');
        edgeProc.kill();
        server.close();
        process.exit(1);
      }
    }, 1000);
  };
});
