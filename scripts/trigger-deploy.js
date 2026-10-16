// Script to trigger Render deployments for Vynora Web Service and Static Site
const https = require('https');

const DEPLOY_HOOKS = [
  {
    name: 'Backend Web Service (vynora-server)',
    url: process.env.RENDER_SERVER_DEPLOY_HOOK
  },
  {
    name: 'Frontend Static Site (vynora-client)',
    url: process.env.RENDER_STATIC_DEPLOY_HOOK
  }
].filter(hook => Boolean(hook.url));

function triggerHook(hook) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Triggering deployment for ${hook.name}...`);
    const req = https.request(hook.url, { method: 'POST' }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ [${hook.name}] Deploy queued successfully! Deploy ID: ${parsed.deploy?.id || JSON.stringify(parsed)}`);
          resolve(parsed);
        } catch {
          console.log(`✅ [${hook.name}] Response: ${data}`);
          resolve(data);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ [${hook.name}] Error triggering deploy hook:`, err.message);
      reject(err);
    });

    req.end();
  });
}

async function run() {
  console.log('==============================================');
  console.log('  VYNORA RENDER AUTO-DEPLOY HOOK TRIGGER');
  console.log('==============================================\n');
  
  if (DEPLOY_HOOKS.length === 0) {
    console.log('⚠️ No deploy hooks configured. Set RENDER_SERVER_DEPLOY_HOOK and/or RENDER_STATIC_DEPLOY_HOOK environment variables to trigger deployments.');
    return;
  }
  
  for (const hook of DEPLOY_HOOKS) {
    try {
      await triggerHook(hook);
    } catch (e) {
      console.error(e);
    }
  }
  
  console.log('\n🎉 Deploy requests submitted to Render successfully.');
}

run();
