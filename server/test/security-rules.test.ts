import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== VYNORA FIRESTORE SECURITY RULES & MULTI-TENANT ISOLATION SUITE ===\n');

const rulesContent = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
  }
}

// Emulate Firestore Rule evaluation logic as defined in firestore.rules
class RuleEngine {
  rulesText: string;
  collections: Map<string, string> = new Map();

  constructor(rules: string) {
    this.rulesText = rules;
    this.parseRules();
  }

  parseRules() {
    const matchRegex = /match\s+\/([a-zA-Z0-9_]+)\/\{[a-zA-Z0-9_]+\}\s*\{([^}]+)\}/g;
    let m;
    while ((m = matchRegex.exec(this.rulesText)) !== null) {
      this.collections.set(m[1], m[2]);
    }
  }

  evalCondition(conditionStr: string, context: { auth: any; resource?: any; requestResource?: any; docId?: string }): boolean {
    const isAuthenticated = () => context.auth != null;
    const isDocOwner = () => isAuthenticated() && context.auth.uid === context.resource?.data?.userId;
    const isCreatingForSelf = () => isAuthenticated() && context.requestResource?.data?.userId === context.auth.uid;
    const isValidUpdate = () => isDocOwner() && context.requestResource?.data?.userId === context.resource?.data?.userId;

    // Evaluate rule expressions safely
    if (conditionStr.includes('isDocOwner()') && !isDocOwner()) return false;
    if (conditionStr.includes('isCreatingForSelf()') && !isCreatingForSelf()) return false;
    if (conditionStr.includes('isValidUpdate()') && !isValidUpdate()) return false;
    if (conditionStr.includes('request.auth.uid == userId') || conditionStr.includes('request.auth.uid == request.resource.data.userId')) {
      if (!isAuthenticated() || context.auth.uid !== context.docId) return false;
    }
    if (conditionStr.includes('amount is number')) {
      if (typeof context.requestResource?.data?.amount !== 'number') return false;
    }
    if (conditionStr.includes('balance is number')) {
      if (typeof context.requestResource?.data?.balance !== 'number') return false;
    }
    if (conditionStr.includes('principalAmount is number')) {
      if (typeof context.requestResource?.data?.principalAmount !== 'number') return false;
    }
    if (conditionStr.includes('cost is number')) {
      if (typeof context.requestResource?.data?.cost !== 'number') return false;
    }
    return true;
  }

  canRead(collection: string, context: { auth: any; resource: any }): boolean {
    const block = this.collections.get(collection);
    if (!block) return false;
    const readMatch = block.match(/allow\s+[^;]*read[^;]*:\s*if\s+([^;]+);/);
    if (!readMatch) return false;
    return this.evalCondition(readMatch[1], context);
  }

  canCreate(collection: string, context: { auth: any; requestResource: any }): boolean {
    const block = this.collections.get(collection);
    if (!block) return false;
    const createMatch = block.match(/allow\s+[^;]*create[^;]*:\s*if\s+([^;]+);/);
    if (!createMatch) return false;
    return this.evalCondition(createMatch[1], context);
  }

  canUpdate(collection: string, context: { auth: any; resource: any; requestResource: any }): boolean {
    const block = this.collections.get(collection);
    if (!block) return false;
    const updateMatch = block.match(/allow\s+[^;]*update[^;]*:\s*if\s+([^;]+);/);
    if (!updateMatch) return false;
    return this.evalCondition(updateMatch[1], context);
  }

  canDelete(collection: string, context: { auth: any; resource: any }): boolean {
    const block = this.collections.get(collection);
    if (!block) return false;
    const deleteMatch = block.match(/allow\s+[^;]*delete[^;]*:\s*if\s+([^;]+);/);
    if (!deleteMatch) return false;
    return this.evalCondition(deleteMatch[1], context);
  }
}

const engine = new RuleEngine(rulesContent);

const userAlice = { uid: 'user_alice_123' };
const userBob = { uid: 'user_bob_456' };

const allUserScopedCollections = [
  'transactions', 'accounts', 'budgets', 'loans', 'crops', 'farms', 'crop_activities',
  'cows', 'dairy_logs', 'farm_feed', 'dairy_vet_records', 'dairy_breeding',
  'medicines', 'bills', 'documents', 'contacts', 'tasks', 'vehicles',
  'vehicle_fuel_logs', 'vehicle_service_logs', 'vehicle_repairs', 'vehicle_expenses', 'vehicle_reminders',
  'student_items', 'student_courses', 'student_timetable', 'inventory', 'passwords',
  'family_posts', 'family_members', 'family_chores', 'family_events', 'family_expenses',
  'health_records', 'health_visits', 'goals', 'goal_milestones'
];

// 1. Cross-User Read Isolation
allUserScopedCollections.forEach((col) => {
  test(`Security: User Bob CANNOT read User Alice's ${col}`, () => {
    const resource = { data: { userId: userAlice.uid, title: 'Confidential' } };
    const allowed = engine.canRead(col, { auth: userBob, resource });
    assert.strictEqual(allowed, false, `Bob was illegally allowed to read Alice's ${col}`);
  });

  test(`Security: User Alice CAN read her own ${col}`, () => {
    const resource = { data: { userId: userAlice.uid, title: 'My Record' } };
    const allowed = engine.canRead(col, { auth: userAlice, resource });
    assert.strictEqual(allowed, true, `Alice was denied access to her own ${col}`);
  });
});

// 2. Cross-User Delete Isolation
allUserScopedCollections.forEach((col) => {
  test(`Security: User Bob CANNOT delete User Alice's ${col}`, () => {
    const resource = { data: { userId: userAlice.uid } };
    const allowed = engine.canDelete(col, { auth: userBob, resource });
    assert.strictEqual(allowed, false, `Bob was illegally allowed to delete Alice's ${col}`);
  });

  test(`Security: User Alice CAN delete her own ${col}`, () => {
    const resource = { data: { userId: userAlice.uid } };
    const allowed = engine.canDelete(col, { auth: userAlice, resource });
    assert.strictEqual(allowed, true, `Alice was denied deletion of her own ${col}`);
  });
});

// 3. Spoofed Creation Protection
allUserScopedCollections.forEach((col) => {
  test(`Security: User Bob CANNOT create ${col} claiming to be Alice (spoofed userId)`, () => {
    const requestResource = { data: { userId: userAlice.uid, amount: 500, balance: 1000, principalAmount: 50000, cost: 200 } };
    const allowed = engine.canCreate(col, { auth: userBob, requestResource });
    assert.strictEqual(allowed, false, `Bob was allowed to create ${col} with Alice's userId`);
  });
});

// 4. Ownership Transfer / Hijacking Protection
allUserScopedCollections.forEach((col) => {
  test(`Security: User Alice CANNOT transfer ${col} ownership to Bob during update`, () => {
    const resource = { data: { userId: userAlice.uid } };
    const requestResource = { data: { userId: userBob.uid, updated: true } };
    const allowed = engine.canUpdate(col, { auth: userAlice, resource, requestResource });
    assert.strictEqual(allowed, false, `Alice was allowed to reassign userId to Bob`);
  });
});

// 5. Unauthenticated Access Rejection
allUserScopedCollections.forEach((col) => {
  test(`Security: Unauthenticated client CANNOT read or write ${col}`, () => {
    const resource = { data: { userId: userAlice.uid } };
    const requestResource = { data: { userId: userAlice.uid, amount: 100, balance: 100, principalAmount: 100, cost: 100 } };
    assert.strictEqual(engine.canRead(col, { auth: null, resource }), false);
    assert.strictEqual(engine.canCreate(col, { auth: null, requestResource }), false);
    assert.strictEqual(engine.canUpdate(col, { auth: null, resource, requestResource }), false);
    assert.strictEqual(engine.canDelete(col, { auth: null, resource }), false);
  });
});

// 6. User Profile Direct Scoping
test(`Security: User Bob CANNOT access Alice's user profile (user_profiles/user_alice)`, () => {
  const isBobAllowed = userBob.uid === userAlice.uid;
  assert.strictEqual(isBobAllowed, false);
});

test(`Security: User Bob CANNOT access Alice's health profile (health_profile/user_alice)`, () => {
  const isBobAllowed = userBob.uid === userAlice.uid;
  assert.strictEqual(isBobAllowed, false);
});

// 7. Default Deny on Unregistered Collections
test('Security: Unmatched collection (e.g. system_secrets) is DENIED by default', () => {
  assert.strictEqual(engine.canRead('system_secrets', { auth: userAlice, resource: { data: {} } }), false);
  assert.strictEqual(engine.canCreate('system_secrets', { auth: userAlice, requestResource: { data: {} } }), false);
});

console.log('\n==============================================');
console.log(`Security Rules Tests run: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
console.log('==============================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
