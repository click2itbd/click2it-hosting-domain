import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });

async function deploy() {
  const rules = getSecurityRules(app);
  const ruleset = await rules.createRuleset(rules.createRulesFileFromSource('firestore.rules', readFileSync(resolve('../firestore.rules'), 'utf8')));
  
  const client = await app.options.credential.getAccessToken();
  const token = client.access_token;
  const releaseName = `projects/gen-lang-client-0990631330/releases/cloud.firestore/ai-studio-422fbad2-d827-4e69-8599-aed85390d277`;

  const payloads = [
    // 1: Body is just the Release object, updateMask in query
    { url: `?updateMask=rulesetName`, body: { name: releaseName, rulesetName: ruleset.name } },
    { url: `?updateMask=release.rulesetName`, body: { name: releaseName, rulesetName: ruleset.name } },
    { url: `?updateMask=ruleset_name`, body: { name: releaseName, rulesetName: ruleset.name } },
    { url: `?updateMask=ruleset_name`, body: { name: releaseName, ruleset_name: ruleset.name } }
  ];

  for (const p of payloads) {
    console.log("Trying", p.url);
    const res = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}${p.url}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(p.body)
    });
    if (res.ok) {
      console.log("SUCCESS on", p.url);
      return;
    } else {
      console.error("Failed:", await res.text());
    }
  }
}
deploy();
