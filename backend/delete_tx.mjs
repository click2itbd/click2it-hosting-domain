import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./firebase-service-account.json", "utf8"));
const config = JSON.parse(readFileSync("../firebase-applet-config.json", "utf8"));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore(config.firestoreDatabaseId);

async function cleanup() {
  console.log("Searching for SALE transactions for Muntasir...");
  
  const snap = await db.collection("transactions")
    .where("type", "==", "sale")
    .where("entityName", "==", "MD Muntasir Alam Resti")
    .get();

  console.log("Found:", snap.size, "transactions");
  for (const d of snap.docs) {
    const data = d.data();
    console.log("  -", d.id, "|", data.description, "|", data.amount);
    await d.ref.delete();
    console.log("  Deleted:", d.id);
  }

  console.log("Done!");
  process.exit(0);
}
cleanup().catch(e => { console.error(e.message); process.exit(1); });
