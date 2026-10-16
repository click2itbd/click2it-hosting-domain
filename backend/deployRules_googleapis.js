import { google } from 'googleapis';
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

    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const firebaserules = google.firebaserules({ version: 'v1', auth });

    const releaseName = `projects/gen-lang-client-0990631330/releases/cloud.firestore/ai-studio-422fbad2-d827-4e69-8599-aed85390d277`;

    console.log("Patching release...");
    const res = await firebaserules.projects.releases.patch({
      name: releaseName,
      requestBody: {
        name: releaseName,
        rulesetName: ruleset.name
      }
    });

    console.log("Release updated!", res.data);
  } catch (err) {
    console.error("Error updating release:", err.message || err);
  }
}
deploy();
