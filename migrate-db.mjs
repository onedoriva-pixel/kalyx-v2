/**
 * KALYX v2 - Database Migration Script
 * Reads scheduler-backup-2026-06-30.json and uploads all data to Firestore.
 *
 * Accounts already exist in Firebase Auth (registered via migrate-backup.html with "Kalyx2024!")
 * This script signs in as each user to get the UID, then writes/merges data to Firestore.
 *
 * Usage: node migrate-db.mjs
 * Run from: d:\Reception\kalyx-v2\
 */

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

// ==================== CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyBgQyeHQrOvGMgp5erVDYhkNFIa5GvAtyM",
  authDomain: "kalyx-36f0d.firebaseapp.com",
  projectId: "kalyx-36f0d",
  storageBucket: "kalyx-36f0d.firebasestorage.app",
  messagingSenderId: "537183146799",
  appId: "1:537183146799:web:7b145625e0c6f6bdc7c7da"
};

// Default password used when accounts were created via migrate-backup.html
const DEFAULT_PASSWORD = "Kalyx2024!";

// All data module keys per username in the backup JSON
const DATA_KEYS = [
  'tasks', 'plans', 'milestones', 'dailylog', 'trips',
  'it_assets', 'it_services', 'it_maintenance', 'it_inventory',
  'it_task', 'it_planner', 'it_accomplishments', 'it_tickets',
  'it_systems',
];

// ==================== INIT ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const backup = JSON.parse(readFileSync('scheduler-backup-2026-06-30.json', 'utf-8'));
const users = backup.users || [];

console.log(`\n🚀 KALYX v2 - Database Migration`);
console.log(`📦 Found ${users.length} users in backup`);
console.log(`📅 Backup exported at: ${backup.exportedAt}\n`);

// ==================== HELPERS ====================
async function getUidByUsername(username) {
  const q = query(collection(db, 'profiles'), where('username', '==', username));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;
  return null;
}

async function writeUserData(uid, user, userData) {
  // Write profile
  await setDoc(doc(db, 'profiles', uid), {
    username: user.username,
    name: user.name || user.username,
    email: user.email,
    role: user.role || 'executive_task',
    is_admin: user.isAdmin || false,
    executive_admin: user.executiveAdmin || false,
  });
  console.log(`   ✅ Profile written`);

  // Read existing data and merge
  const existingSnap = await getDoc(doc(db, 'userdata', uid));
  const existingData = existingSnap.exists() ? (existingSnap.data().data || {}) : {};

  const mergedData = { ...existingData };
  let newRecords = 0;
  for (const [k, v] of Object.entries(userData)) {
    // Merge arrays by unique id instead of skipping
    if (Array.isArray(mergedData[k]) && Array.isArray(v)) {
      const existingIds = new Set(mergedData[k].map(item => item.id));
      const newItems = v.filter(item => !existingIds.has(item.id));
      if (newItems.length > 0) {
        mergedData[k] = [...mergedData[k], ...newItems];
        newRecords += newItems.length;
        console.log(`   ✅ Merged ${newItems.length} new items into '${k}'`);
      } else {
        console.log(`   ✓ '${k}' — all ${v.length} records already exist`);
      }
    } else if (!mergedData[k] || (Array.isArray(mergedData[k]) && mergedData[k].length === 0)) {
      mergedData[k] = v;
      if (Array.isArray(v)) newRecords += v.length;
    } else {
      console.log(`   ⚠  Skipping '${k}' — already has data (non-array)`);
    }
  }

  await setDoc(doc(db, 'userdata', uid), {
    data: mergedData,
    updated_at: new Date().toISOString(),
  });
  console.log(`   ✅ Userdata written (${newRecords} new records merged)`);
}

// ==================== MAIN LOOP ====================
let successCount = 0;
let errorCount = 0;

for (const user of users) {
  const { username, email } = user;

  // Collect user data from backup
  const userData = {};
  for (const key of DATA_KEYS) {
    const backupKey = `${key}_${username}`;
    if (backup[backupKey] !== undefined) {
      userData[key] = backup[backupKey];
    }
  }

  const totalItems = Object.values(userData).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0
  );

  console.log(`\n👤 ${user.name} (${username}) — ${email} [${totalItems} records]`);

  let uid = null;

  // === ATTEMPT 1: Sign in with default password ===
  try {
    const cred = await signInWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
    uid = cred.user.uid;
    console.log(`   ✅ Signed in. UID: ${uid}`);
    await writeUserData(uid, user, userData);
    await signOut(auth);
    successCount++;
    continue;
  } catch (signInErr) {
    if (signInErr.code !== 'auth/invalid-credential' && signInErr.code !== 'auth/user-not-found') {
      // Different error — try to find UID from Firestore directly
      console.warn(`   ⚠  Sign-in failed (${signInErr.code}) — looking up UID from Firestore profiles...`);
    }
  }

  // === ATTEMPT 2: Account exists but with a different password — look up UID by username ===
  try {
    uid = await getUidByUsername(username);
    if (uid) {
      console.log(`   ✅ Found profile UID via Firestore: ${uid}`);
      // We can still write userdata if signed in as admin (client SDK allows setDoc on own doc)
      // But since we're not signed in, we'll need to write directly — this requires a signed-in user.
      // Fallback: write with best-effort (may fail if security rules block)
      await writeUserData(uid, user, userData);
      console.log(`   ⚠  NOTE: Auth password was NOT updated (different from Kalyx2024!).`);
      successCount++;
      continue;
    }
  } catch (lookupErr) {
    console.error(`   ❌ Firestore lookup failed: ${lookupErr.message}`);
  }

  // === ATTEMPT 3: Create new account ===
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
    uid = cred.user.uid;
    console.log(`   ✅ Created new account. UID: ${uid}`);
    await writeUserData(uid, user, userData);
    await signOut(auth);
    successCount++;
  } catch (createErr) {
    console.error(`   ❌ All attempts failed for ${email}: ${createErr.message}`);
    errorCount++;
  }
}

console.log(`\n=================================`);
console.log(`✅ Migration complete!`);
console.log(`   Success: ${successCount}/${users.length} users`);
console.log(`   Errors:  ${errorCount}/${users.length} users`);
console.log(`=================================\n`);
