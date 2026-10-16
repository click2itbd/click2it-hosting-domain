import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });

async function deploy() {
  const client = await app.options.credential.getAccessToken();
  const token = client.access_token;
  
  // To avoid patching issues, let's just DELETE the release and then create it!
  const releaseName = `projects/gen-lang-client-0990631330/releases/cloud.firestore/ai-studio-422fbad2-d827-4e69-8599-aed85390d277`;
  
  console.log("Deleting release...");
  await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const rules = (await import('firebase-admin/security-rules')).getSecurityRules(app);
  const source = readFileSync(resolve('../firestore.rules'), 'utf8');
  const ruleset = await rules.createRuleset(rules.createRulesFileFromSource('firestore.rules', source));
  console.log("Ruleset created:", ruleset.name);
  
  console.log("Creating new release...");
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/gen-lang-client-0990631330/releases`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: releaseName,
      rulesetName: ruleset.name
    })
  });
  
  if (!res.ok) {
    console.error("Failed to recreate release:", await res.text());
  } else {
    console.log("SUCCESS!");
  }
}
deploy();
