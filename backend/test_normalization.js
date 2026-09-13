const http = require('http');

async function testApi(inputUrl) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ url: inputUrl });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/fetch-html',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  const tests = [
    { url: "example.com", desc: "Bare domain", expectStatus: 200, expectSuccess: true },
    { url: "www.example.com", desc: "www domain", expectStatus: 200, expectSuccess: true },
    { url: "https://example.com", desc: "https domain", expectStatus: 200, expectSuccess: true },
    { url: "http://example.com", desc: "http domain", expectStatus: 200, expectSuccess: true },
    { url: "https://example.com/article?test=1#section", desc: "Path, query, hash", expectStatus: 404, expectSuccess: false }, // example.com/article doesn't exist, returns 404
    { url: "", desc: "Blank input", expectStatus: 400, expectSuccess: false },
    { url: "malformed://example.com", desc: "Malformed protocol", expectStatus: 403, expectSuccess: false }, // Wait, SSRF blocks it or Invalid Protocol?
    { url: "ftp://example.com", desc: "Unsupported protocol", expectStatus: 403, expectSuccess: false },
    { url: "localhost", desc: "Localhost", expectStatus: 403, expectSuccess: false }, // Should block SSRF
    { url: "192.168.1.1", desc: "Private IP", expectStatus: 403, expectSuccess: false } // Should block SSRF
  ];

  console.log("Running backend smoke tests against freshly restarted backend (localhost:3000)...\\n");
  
  for (const t of tests) {
    const result = await testApi(t.url);
    const status = result.status;
    const isSuccess = result.data?.success === true;
    let details = "";
    
    if (isSuccess) {
      details = `Normalized to: ${result.data.url}`;
    } else {
      details = `Error: ${result.data?.error || result.raw}`;
    }
    
    console.log(`[${t.desc}] "${t.url}"`);
    console.log(`  -> HTTP ${status} | ${details}\\n`);
  }
}

runTests();
