const http = require('http');
const { spawn } = require('child_process');

const PORT = 3001;
const MOCK_PORT = 3002;

// 1x1 transparent PNG
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

async function startMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/image') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(pngBytes);
      } else if (req.url === '/not-found') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } else if (req.url === '/html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Hi</body></html>');
      } else if (req.url === '/oversized') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        // Send a 1MB chunk every 100ms infinitely
        const chunk = Buffer.alloc(1024 * 1024, 0);
        const interval = setInterval(() => {
          res.write(chunk);
        }, 100);
        req.on('close', () => clearInterval(interval));
      } else if (req.url === '/slow') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        // Send headers, but delay body by 15s
        setTimeout(() => {
          res.end(pngBytes);
        }, 15000);
      } else if (req.url === '/redirect-private') {
        res.writeHead(302, { 'Location': 'http://10.0.0.1/' });
        res.end();
      } else if (req.url === '/redirect-image') {
        res.writeHead(302, { 'Location': '/image' });
        res.end();
      } else {
        res.writeHead(500);
        res.end();
      }
    });

    server.listen(MOCK_PORT, () => {
      resolve(server);
    });
  });
}

async function testProxy(inputUrl) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: `/api/proxy-image?url=${encodeURIComponent(inputUrl)}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = Buffer.alloc(0);
      res.on('data', chunk => {
        body = Buffer.concat([body, chunk]);
        if (body.length > 15 * 1024 * 1024) {
          req.destroy(); // safety valve for test script memory
        }
      });
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          contentType: res.headers['content-type'],
          size: body.length,
          bodyStr: body.toString('utf8').substring(0, 100)
        });
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.end();
  });
}

async function runTests() {
  console.log(`Starting mock server on port ${MOCK_PORT}...`);
  const mockServer = await startMockServer();

  console.log(`Starting backend server on port ${PORT}...`);
  const serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: PORT.toString(), ALLOW_LOCALHOST: 'true' }
  });

  await new Promise(resolve => setTimeout(resolve, 1500));

  const tests = [
    { url: `http://localhost:${MOCK_PORT}/image`, desc: "Valid image" },
    { url: `http://localhost:${MOCK_PORT}/not-found`, desc: "Upstream 404" },
    { url: `http://localhost:${MOCK_PORT}/html`, desc: "HTML response" },
    { url: `http://localhost:${MOCK_PORT}/oversized`, desc: "Oversized image (expect 413)" },
    { url: `http://localhost:${MOCK_PORT}/slow`, desc: "Slow response" },
    { url: `http://localhost:${MOCK_PORT}/redirect-private`, desc: "Redirect to private IP" },
    { url: `http://localhost:${MOCK_PORT}/redirect-image`, desc: "Valid redirect to image" }
  ];

  console.log("\\nRunning backend image proxy tests...\\n");
  
  for (const t of tests) {
    const result = await testProxy(t.url);
    console.log(`[${t.desc}] "${t.url}"`);
    console.log(`  -> HTTP ${result.status}`);
    if (result.status === 200) {
      console.log(`     Content-Type: ${result.contentType}`);
      console.log(`     Size: ${result.size} bytes`);
    } else {
      let errorMsg = result.bodyStr || result.error;
      if (errorMsg.includes('<html')) errorMsg = "Express HTML Error (check logs)";
      console.log(`     Error msg: ${errorMsg}`);
    }
    console.log('');
  }

  console.log("Shutting down servers...");
  serverProcess.kill();
  mockServer.close();
}

runTests();
