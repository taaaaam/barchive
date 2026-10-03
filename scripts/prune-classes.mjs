// One-off cleanup for the "classes" collection: removes class years with no
// members, and duplicate docs for years that do have members (keeps one each).
//
// Dry run (shows what would be deleted, changes nothing):
//   node --env-file=.env.local scripts/prune-classes.mjs
// Actually delete:
//   node --env-file=.env.local scripts/prune-classes.mjs --apply
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

const apply = process.argv.includes("--apply");
const env = process.env;
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const classes = await getDocs(collection(db, "classes"));
const members = await getDocs(collection(db, "members"));
const yearsWithMembers = new Set(
  members.docs.map((d) => String(d.data().classYear))
);

const idsByYear = {};
for (const d of classes.docs) {
  (idsByYear[String(d.data().year)] ||= []).push(d.id);
}

const toDelete = [];
for (const [year, ids] of Object.entries(idsByYear)) {
  if (!yearsWithMembers.has(year)) {
    toDelete.push(...ids.map((id) => ({ year, id, reason: "no members" })));
  } else {
    // Prefer the doc whose ID is the year itself (the new convention)
    const keep = ids.includes(year) ? year : ids[0];
    toDelete.push(
      ...ids
        .filter((id) => id !== keep)
        .map((id) => ({ year, id, reason: "duplicate" }))
    );
  }
}

toDelete.sort((a, b) => a.year.localeCompare(b.year));
for (const { year, id, reason } of toDelete) {
  console.log(`${apply ? "deleting" : "would delete"}  ${year}  ${id}  (${reason})`);
  if (apply) await deleteDoc(doc(db, "classes", id));
}

const keptYears = Object.keys(idsByYear)
  .filter((y) => yearsWithMembers.has(y))
  .sort();
console.log(`\n${toDelete.length} docs ${apply ? "deleted" : "would be deleted"}.`);
console.log(`Years kept: ${keptYears.join(" ")}`);
if (!apply) console.log("Dry run only. Re-run with --apply to delete.");
process.exit(0);
