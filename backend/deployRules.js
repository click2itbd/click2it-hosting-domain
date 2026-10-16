import { initializeApp, cert } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function deploy() {
  try {
    const rulesPath = resolve('../firestore.rules');
    const source = readFileSync(rulesPath, 'utf8');
    
    console.log("Deploying Firestore Rules...");
    
    const rules = getSecurityRules(app);
    // Create a ruleset
    const ruleset = await rules.createRuleset(
      rules.createRulesFileFromSource('firestore.rules', source)
    );
    console.log("Ruleset created:", ruleset.name);

    // Release to default db
    await rules.createRelease('cloud.firestore', ruleset.name);
    console.log("Released to default db");

    // Release to named db
    await rules.createRelease('cloud.firestore/ai-studio-422fbad2-d827-4e69-8599-aed85390d277', ruleset.name);
    console.log("Released to named db");
    
  } catch (error) {
    console.error("Error deploying rules:", error);
  }
}

deploy();
