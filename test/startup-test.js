import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

for (const entrypoint of ['src/index.js', 'bin/mcp-salesforce.js']) {
  test(`${entrypoint} responds to MCP initialization`, () => {
    const serverPath = realpathSync(fileURLToPath(new URL(`../${entrypoint}`, import.meta.url)));
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'startup-test', version: '1.0.0' }
      }
    };
    const result = spawnSync(process.execPath, [serverPath], {
      input: `${JSON.stringify(request)}\n`,
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, NODE_ENV: 'test', DISABLE_BROWSER_OPEN: 'true' }
    });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const responses = result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    assert.equal(responses.length, 1, `Expected one initialization response; stderr: ${result.stderr}`);
    const response = responses[0];
    assert.equal(response.jsonrpc, '2.0');
    assert.equal(response.id, request.id);
    assert.equal(response.error, undefined);
    assert.equal(response.result.protocolVersion, request.params.protocolVersion);
    assert.equal(response.result.serverInfo.name, 'mcp-salesforce');
    assert.equal(response.result.serverInfo.version, version);
    assert.deepEqual(response.result.capabilities.tools, {});
  });
}
