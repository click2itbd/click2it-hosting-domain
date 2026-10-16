import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });

async function deploy() {
  try {
    const rulesPath = resolve('../firestore.rules');
    const source = readFileSync(rulesPath, 'utf8');
    const rules = getSecurityRules(app);
    const ruleset = await rules.createRuleset(rules.createRulesFileFromSource('firestore.rules', source));
    console.log("Ruleset created:", ruleset.name);

    const client = await app.options.credential.getAccessToken();
    const token = client.access_token;
    
    const releaseName = `projects/gen-lang-client-0990631330/releases/cloud.firestore/ai-studio-422fbad2-d827-4e69-8599-aed85390d277`;
    
    const res = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        release: {
          name: releaseName,
          rulesetName: ruleset.name
        },
        updateMask: "rulesetName"
      })
    });
    
    if (!res.ok) {
      console.error("Failed:", await res.text());
    } else {
      console.log("SUCCESS!", await res.json());
    }
  } catch (err) {
    console.error(err);
  }
}
deploy();
