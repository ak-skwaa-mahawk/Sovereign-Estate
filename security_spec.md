# Firestore Security Specification & Threat Model
## Synara-Class Vessel Control (Sovereign Manifold)

### 1. Data Invariants

1. **Identity Isolation**: A user's vessel state and activity logs can only be read or written by the specific authenticated user whose `uid` matches the `{userId}` wildcard in the resource path.
2. **Email Verification**: Standard writing operations are only permitted for users with fully verified email accounts (`email_verified == true`).
3. **Temporal Integrity**: All state modifications must enforce `updatedAt` matching `request.time`. Created states must have `createdAt` or `updatedAt` set via server timestamps.
4. **Volumetric Boundaries**: Log messages must be verified to be strings under `1000` characters to prevent Denial of Wallet storage exhaustion.
5. **State immutability**: The `userId` property on `VesselState` cannot be modified or updated after creation to prevent resource hijacking.

---

### 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent specific attempts by malicious actors to bypass security rules:

#### Payload 1: Hijack State Ownership (Identity Spoofing)
*   **Target Path**: `/users/legit-user-123/vessel_state/FPT-Omega`
*   **Attacker UID**: `malicious-attacker-666`
*   **Attack Vector**: Attempt to overwrite another user's active vessel state.

#### Payload 2: Write with Unverified Account (Email Spoofing)
*   **Target Path**: `/users/unverified-user/vessel_state/FPT-Omega`
*   **Attacker Claims**: `{ email: "command@vessel.com", email_verified: false }`
*   **Attack Vector**: Write state values without verifying identity email.

#### Payload 3: Log Spamming / Space Exhaustion (Denial of Wallet)
*   **Target Path**: `/users/legit-user-123/logs/malicious-log`
*   **Payload Message**: A 2.5MB string of random characters.
*   **Attack Vector**: Exhaust Firestore storage quotas to raise monthly bill and trigger a Denial of Service.

#### Payload 4: Invalid Severity Level Injection (Enum Bypass)
*   **Target Path**: `/users/legit-user-123/logs/anomaly-log`
*   **Payload Level**: `"NUCLEAR_CRITICAL_BLOWOUT"`
*   **Attack Vector**: Injecting a non-standard custom level to corrupt log filter state.

#### Payload 5: Spoofed System Timestamp (Temporal Bypass)
*   **Target Path**: `/users/legit-user-123/vessel_state/FPT-Omega`
*   **Payload**: `{ updatedAt: "1999-12-31T23:59:59Z" }` (Client-supplied past timestamp)
*   **Attack Vector**: Avoid timestamp-sync rule by sending pre-recorded client data.

#### Payload 6: Negative Repair Cycle Counter (Integer Injection)
*   **Target Path**: `/users/legit-user-123/vessel_state/FPT-Omega`
*   **Payload**: `{ repairCyclesCount: -999999 }`
*   **Attack Vector**: Resetting cumulative cycle counts to mask stress damage.

#### Payload 7: Shadow Field Insertion (Schemaless Attack)
*   **Target Path**: `/users/legit-user-123/vessel_state/FPT-Omega`
*   **Payload**: `{ isAdmin: true, bypassEmergencyAutoRepair: true, extraShadowField: "compromised" }`
*   **Attack Vector**: Injecting unvalidated properties to trigger downstream parsing exploits.

#### Payload 8: Log Record Tampering (Immutable Log Bypass)
*   **Target Path**: `/users/legit-user-123/logs/log-xyz`
*   **Operation**: Update log message after it has been locked.
*   **Attack Vector**: Overwriting historic logs to hide evidence of system anomalies or malicious commands.

#### Payload 9: Path Wildcard Character Poisoning
*   **Target Path**: `/users/legit-user-123/logs/../../global_configs/vessel`
*   **Attack Vector**: Injecting folder traversal tokens into the document ID wildcard.

#### Payload 10: Anonymous Writing Attempt
*   **Target Path**: `/users/anonymous-uid/vessel_state/FPT-Omega`
*   **Attacker Claims**: Anonymous provider login.
*   **Attack Vector**: Writing tracking data without authenticating via Google.

#### Payload 11: Owner UID Mutability Attack
*   **Target Path**: `/users/legit-user-123/vessel_state/FPT-Omega`
*   **Update Payload**: `{ userId: "another-recipient-uid" }`
*   **Attack Vector**: Changing ownership field after document creation to swap controller authority.

#### Payload 12: Blanket Data Scrape (Query Scraping)
*   **Target Path**: `/users/legit-user-123/logs`
*   **Query**: Standard request with no filter constraints.
*   **Attack Vector**: Listing logs of all users on the network.

---

### 3. Verification Test Suite Configuration (`firestore.rules.test.ts`)

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Sovereign Manifold Security Rules Test Suite", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "gen-lang-client-0886380232",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("blocks user from writing to another user's vessel state (Payload 1)", async () => {
    const maliciousAuth = testEnv.authenticatedContext("malicious-attacker-666", {
      email: "attacker@malicious.com",
      email_verified: true,
    });
    const db = maliciousAuth.firestore();
    const targetRef = db.doc("users/legit-user-123/vessel_state/FPT-Omega");

    await assertFails(
      targetRef.set({
        repairCyclesCount: 1,
        cumulativeNanitesDischarged: 150,
        lastOverhaulCount: 0,
        hullIntegrity: 98.5,
        emergencyAutoRepair: false,
        updatedAt: new Date().toISOString(),
        userId: "legit-user-123",
      })
    );
  });

  it("blocks writing when email is unverified (Payload 2)", async () => {
    const unverifiedAuth = testEnv.authenticatedContext("unverified-user", {
      email: "command@vessel.com",
      email_verified: false,
    });
    const db = unverifiedAuth.firestore();
    const ref = db.doc("users/unverified-user/vessel_state/FPT-Omega");

    await assertFails(
      ref.set({
        repairCyclesCount: 5,
        cumulativeNanitesDischarged: 500,
        lastOverhaulCount: 0,
        hullIntegrity: 99.0,
        emergencyAutoRepair: true,
        updatedAt: new Date().toISOString(),
        userId: "unverified-user",
      })
    );
  });

  it("blocks logs exceeding volumetric size limits (Payload 3)", async () => {
    const verifiedAuth = testEnv.authenticatedContext("legit-user-123", {
      email: "captain@vessel.com",
      email_verified: true,
    });
    const db = verifiedAuth.firestore();
    const ref = db.doc("users/legit-user-123/logs/heavy-log");

    const hugeMessage = "A".repeat(1500); // Exceeds 1000 characters limit

    await assertFails(
      ref.set({
        id: "heavy-log",
        timestamp: new Date().toISOString(),
        level: "INFO",
        message: hugeMessage,
        userId: "legit-user-123",
      })
    );
  });
});
```
