import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = resolve('./firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });

async function list() {
  const client = await app.options.credential.getAccessToken();
  const token = client.access_token;
  const projectId = 'gen-lang-client-0990631330';
  
  const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await res.text());
}
list();
