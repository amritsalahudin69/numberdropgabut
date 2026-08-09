# TSA MARBLEDROP — ITERATION 0 BASELINE RECONCILIATION

**Report Date:** 2026-08-09 20:08:33 UTC+7  
**Repository:** C:\Users\HP\Documents\project\muerbledrop  
**Environment:** Windows PowerShell, npm local

---

## REPOSITORY STATE SNAPSHOT

**Before Audit:**
```
Branch: main
HEAD: 74f2d00 lali
Working Tree: CLEAN (no modified or untracked files)
```

**After Audit:**
```
Branch: main
HEAD: 74f2d00 lali
Working Tree: CLEAN (no modifications made)
```

---

## BASELINE CONTRACT MATRIX

### CONTRACT A — GAMEPLAY CORE

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| MarbleDropSession sole owner | Present | Present | ✓ MATCH |
| CollisionResolver transaction owner | Present | Present | ✓ MATCH |
| MarbleDropGame collision orchestrator | Present | Present | ✓ MATCH |
| NumberTextureCache canonical cache | Present | Present | ✓ MATCH |
| session.currentValue === gacoan.value invariant | Verified | Verified | ✓ PASS |

**Responsible Files:** src/game/MarbleDropSession.js, src/systems/CollisionResolver.js, src/game/MarbleDropGame.js

---

### CONTRACT B — STATE MACHINE

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| Gate lifecycle: READY→FALLING→RESOLVING→HOLDING→FALLING | Correct | Correct | ✓ MATCH |
| Goal lifecycle: FALLING→RESOLVING→HOLDING→CLEANUP | Correct | Correct | ✓ MATCH |
| No new states added | Confirmed | Confirmed | ✓ PASS |

**Responsible Files:** src/game/MarbleDropSession.js

---

### CONTRACT C — GATE CONSUMPTION

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| consumedGateIds owner: MarbleDropGame | MarbleDropGame | MarbleDropGame | ✓ MATCH |
| One active gacoan + one gate = max one op | Verified | Verified | ✓ PASS |
| First gate hit accepted | Verified | Verified | ✓ PASS |
| Same gate + same gacoan ignored | Verified | Verified | ✓ PASS |
| Different gate + same gacoan allowed once | Verified | Verified | ✓ PASS |
| New active gacoan clears consumedGateIds | Line 308 verified | Required | ✓ PASS |
| Does NOT depend on physical overlap | Confirmed | Confirmed | ✓ PASS |
| Does NOT depend on gate exit | Confirmed | Confirmed | ✓ PASS |
| Does NOT depend on elapsed time | Confirmed | Confirmed | ✓ PASS |
| blockedGates competing contract: NONE | No matches found | None | ✓ PASS |

**Responsible Files:** src/game/MarbleDropGame.js (processCollisionEvents)

---

### CONTRACT D — COLLISION OWNERSHIP

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| processCollisionEvents validates collision started | Line 370 | Required | ✓ PASS |
| both collider metadata exist | Line 371-372 | Required | ✓ PASS |
| one collider is current active gacoan | Line 383-387 | Required | ✓ PASS |
| registry entity === activeGacoan | Line 386 | Required | ✓ PASS |
| session activeGacoan === game activeGacoan | Line 387 | Required | ✓ PASS |
| entity not destroyed | Line 388 | Required | ✓ PASS |
| collider still registered | Line 390-391 | Required | ✓ PASS |
| session state === FALLING | Line 392 | Required | ✓ PASS |
| Handle validation allows 0 | `gHandle == null` | Correct | ✓ PASS |
| Peg remains physics-only | processCollisionEvents skips | Correct | ✓ PASS |
| Goal outside consumedGateIds | Line 425 isGoal handling | Correct | ✓ PASS |

**Responsible Files:** src/game/MarbleDropGame.js (processCollisionEvents, line 368-432)

---

### CONTRACT E — VISUAL ASSET CATALOG

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| VISUAL_ASSETS.background type | string URL | string URL | ✓ MATCH |
| VISUAL_ASSETS.background value | '/assets/marbledrop/background/bg (2).jpg' | Expected URL | ✓ MATCH |
| peg | null | null | ✓ MATCH |
| gate | null | null | ✓ MATCH |
| goal | null | null | ✓ MATCH |
| effects | null | null | ✓ MATCH |
| No nested layer1/layer2/layer3 | Confirmed | Confirmed | ✓ PASS |
| No duplicate fake layers | Confirmed | Confirmed | ✓ PASS |
| Catalog canonical | Object.freeze() | Object.freeze() | ✓ PASS |

**Responsible Files:** src/config/visualAssets.js

---

### CONTRACT F — VISUAL TEXTURE CACHE

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| Browser-safe PIXI Assets loader | Uses pixi.js Assets API | Required | ✓ PASS |
| No Node fs/path dependency | Zero matches in grep | None required | ✓ PASS |
| No fs.existsSync | Zero matches in grep | None required | ✓ PASS |
| Transactional preload present | Verified line 25-50 | Required | ✓ PASS |
| All assets must succeed | tempMap accumulation | Required | ✓ PASS |
| Partial failure rollback | Clear map, loaded=false | Required | ✓ PASS |
| loaded flag false on failure | Line 41-44 | Required | ✓ PASS |
| destroy() clears references | Verified | Required | ✓ PASS |
| NumberTextureCache unchanged | Confirmed | Confirmed | ✓ PASS |

**Responsible Files:** src/systems/VisualTextureCache.js

---

### CONTRACT G — VISUAL BOOT

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| MarbleDropApp → VisualTextureCache.preload | Line 55 | Required | ✓ PASS |
| MarbleDropApp → Game injection | Line 58-63 | Required | ✓ PASS |
| Game → BackgroundLayer creation | Line 85 | Required | ✓ PASS |
| BackgroundLayer sprite mounted | Line 86 verify | Required | ✓ PASS |
| Background below gameplay container | stage.addChildAt(bg, 0) | Required | ✓ PASS |
| Required background failure propagates | Line 73-88 no try-catch | Required | ✓ PASS |
| No dead visual modules | BackgroundLayer imported/used | Required | ✓ PASS |
| Production chain complete | App→Cache→Game→Layer | Required | ✓ PASS |

**Responsible Files:** src/app/MarbleDropApp.js, src/game/MarbleDropGame.js, src/rendering/BackgroundLayer.js, src/systems/VisualTextureCache.js

---

### CONTRACT H — REQUIRED BACKGROUND FAILURE POLICY

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| VISUAL_ASSETS.background is required | Verified | Yes | ✓ PASS |
| VisualTextureCache unavailable fails boot | Line 73-74 | Required | ✓ PASS |
| cache.get unavailable fails boot | Line 73-74 | Required | ✓ PASS |
| texture missing fails boot | Line 77-79 | Required | ✓ PASS |
| stage unavailable fails boot | Line 68-70 | Required | ✓ PASS |
| BackgroundLayer mount fails boot | Line 85 throws | Required | ✓ PASS |
| sprite not mounted fails boot | Line 88-90 | Required | ✓ PASS |
| No catch that continues READY | Confirmed | Forbidden | ✓ PASS |
| Boot fails cleanly with error | Line 95-97 propagate | Required | ✓ PASS |

**Responsible Files:** src/game/MarbleDropGame.js (init method)

---

### CONTRACT I — BACKGROUND LAYER CONTRACT

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| PIXI Sprite creation | Line 48 | Required | ✓ PASS |
| Sprite at stage index 0 | Line 59 addChildAt(_, 0) | Required | ✓ PASS |
| World 1920×1080 | Line 4 default | Correct | ✓ PASS |
| Deterministic cover scale | Line 55-57 | Correct | ✓ PASS |
| Game container above background | MarbleDropGame line 93 | Required | ✓ PASS |
| destroy() removes sprite | Line 79-82 | Required | ✓ PASS |
| destroy() idempotent | Checks this.sprite null | Required | ✓ PASS |
| Does NOT destroy shared texture | destroy({texture: false}) | Required | ✓ PASS |

**Responsible Files:** src/rendering/BackgroundLayer.js

---

### CONTRACT J — FAILED BOOT ATOMICITY

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| state → FAILED on error | Line 95 | Required | ✓ PASS |
| _cleanupAfterFailedInit() called | Line 96 | Required | ✓ PASS |
| Partial resources cleaned | Line 99-128 | Required | ✓ PASS |
| NOT marked DESTROYED on failure | state = FAILED, not DESTROYED | Required | ✓ PASS |
| Ticker cleanup if registered | Line 102-104 | Required | ✓ PASS |
| Game cleanup if created | Line 106-109 | Required | ✓ PASS |
| Visual cache cleanup | Line 111-113 | Required | ✓ PASS |
| Number cache cleanup | Line 114-116 | Required | ✓ PASS |
| Renderer/physics/assets cleanup | Line 117-125 | Required | ✓ PASS |

**Responsible Files:** src/app/MarbleDropApp.js (_cleanupAfterFailedInit)

---

### CONTRACT K — NORMAL DESTROY CONTRACT

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| state → DESTROYED | Line 129 | Required | ✓ PASS |
| Idempotent (no secondary throws) | Conditional checks | Required | ✓ PASS |
| No duplicate game.destroy() | One call only | Required | ✓ PASS |
| Deterministic cleanup order | ticker → game → caches → infra | Required | ✓ PASS |
| game cleanup includes background | Line 578-581 in game destroy | Required | ✓ PASS |
| game cleanup includes feedback | Line 567-570 in game destroy | Required | ✓ PASS |

**Responsible Files:** src/app/MarbleDropApp.js (destroy), src/game/MarbleDropGame.js (destroy)

---

### CONTRACT L — RESET-DURING-HOLD LIFECYCLE

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| reset() during HOLDING works | Tested | Required | ✓ PASS |
| Feedback cleared immediately | MarbleDropGame.reset line 527 | Required | ✓ PASS |
| Old active gacoan gone | cleanupActiveGacoan called | Required | ✓ PASS |
| Hold context cleared | Session reset | Required | ✓ PASS |
| consumedGateIds cleared | consumedGateIds.clear() | Required | ✓ PASS |
| Session → READY | Session reset transition | Required | ✓ PASS |
| currentValue = startingValue | Session.reset | Required | ✓ PASS |
| No stale hold after reset | Verified in test | Required | ✓ PASS |

**Responsible Files:** src/game/MarbleDropGame.js (reset, cleanupActiveGacoan)

---

### CONTRACT M — PACKAGE BASELINE

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| ask-antigravity-mcp dependency | None | Absent | ✓ PASS |
| @bacnh85/pi-agy dependency | None | Absent | ✓ PASS |
| @dimforge/rapier2d-compat present | Present | Required | ✓ PASS |
| pixi.js present | Present | Required | ✓ PASS |
| vite present | Present | Required | ✓ PASS |
| test:foundation script | Present | Required | ✓ PASS |
| test:core script | Present | Required | ✓ PASS |
| test:feedback script | Present | Required | ✓ PASS |
| test:lifecycle script | Present | Required | ✓ PASS |
| test:gate-lock script | Present | Required | ✓ PASS |
| test:visual script | Present | Required | ✓ PASS |
| assets:visual script | Present | Required | ✓ PASS |
| check aggregation | Present | Required | ✓ PASS |

**Responsible Files:** package.json

---

### CONTRACT N — TEST QUALITY

| Item | Current | Expected | Status |
|------|---------|----------|--------|
| Tests validate behavior (not source regex) | Verified | Required | ✓ PASS |
| visual-boot-contract.test.mjs covers 8 scenarios | A-H all present | Required | ✓ PASS |
| gate-lock.test.mjs exercises actual code | processCollisionEvents | Required | ✓ PASS |
| hold-lifecycle.test.mjs exercises actual code | Hold state transitions | Required | ✓ PASS |
| reset-during-hold.test.mjs exercises code | Reset during HOLDING | Required | ✓ PASS |
| All affected tests provide fakeVisualTextureCache | Confirmed | Required | ✓ PASS |
| Visual cache test seam (_isFakeTexture) | Verified | Required | ✓ PASS |

**Responsible Files:** tests/*.test.mjs

---

## AUTOMATED VALIDATION RESULTS

### Asset Validation

```
npm run assets:index          ✓ PASS
npm run assets:validate       ✓ PASS
npm run assets:level          ✓ PASS
npm run assets:visual         ✓ PASS
```

### Test Suites

```
npm run test:foundation       ✓ PASS (asset-service, boot-contract)
npm run test:core             ✓ PASS (calculation, session, collision, restart)
npm run test:feedback         ✓ PASS (feedback, hold-lifecycle, gacoan, reset)
npm run test:lifecycle        ✓ PASS (lifecycle-hardening)
npm run test:gate-lock        ✓ PASS (gate-lock)
npm run test:visual           ✓ PASS (assets, background-layer, wiring, contract)
```

### Build

```
npm run build                 ✓ PASS (✓ built in 10.66s)
```

### Full Check

```
npm run check                 ✓ PASS (all commands exit 0)
```

---

## STATIC VERIFICATION CHECKLIST

| Item | Status | Evidence |
|------|--------|----------|
| No Node fs/path in visual runtime | ✓ PASS | Zero grep matches |
| No competing blockedGates | ✓ PASS | Zero grep matches |
| No duplicate game.destroy() | ✓ PASS | Single call in destroy |
| No swallowed background failure | ✓ PASS | No try-catch around mount |
| No document-based visual bypass | ✓ PASS | Always preload VISUAL_ASSETS |
| VISUAL_ASSETS.background is string | ✓ PASS | src/config/visualAssets.js |
| Visual cache uses exact URL | ✓ PASS | Line 34: key = url (no mutation) |
| BackgroundLayer imported/used | ✓ PASS | Imported line 14, used line 85 |
| consumedGateIds production-owned | ✓ PASS | MarbleDropGame line 34 |
| Handle 0 guard correct | ✓ PASS | `gHandle == null` (not `!gHandle`) |

---

## FILES RECONCILED

**No modifications required.**

All baseline contracts are correct in current source.

Working repository is already compliant with TSA baseline.

---

## FILES INSPECTED BUT UNCHANGED

1. src/app/MarbleDropApp.js
2. src/game/MarbleDropGame.js
3. src/game/MarbleDropSession.js
4. src/game/MarbleDropRules.js
5. src/core/CollisionRegistry.js
6. src/core/PhysicsWorld.js
7. src/core/Renderer.js
8. src/core/Clock.js
9. src/systems/CalculationService.js
10. src/systems/CollisionResolver.js
11. src/systems/AssetService.js
12. src/systems/NumberTextureCache.js
13. src/systems/VisualTextureCache.js
14. src/systems/FeedbackService.js
15. src/rendering/BackgroundLayer.js
16. src/config/constants.js
17. src/config/visualAssets.js
18. src/config/levels/level1.js
19. tests/*.test.mjs (all 17 test files)
20. scripts/*.mjs (validation scripts)
21. package.json

---

## KNOWN FEATURES INTENTIONALLY NOT IMPLEMENTED (OUT OF SCOPE)

As per Iteration 0 baseline reconciliation scope:

- ✗ Level-1 parity reconciliation with gamaBaruRebrain
- ✗ targetValue property
- ✗ Goal character artwork
- ✗ TARGET strip UI
- ✗ responsive feedback sizing
- ✗ sound/audio
- ✗ telemetry/history tracking
- ✗ objective completion rule
- ✗ exact-target completion
- ✗ Result Card UI
- ✗ Restart button UI
- ✗ Export JSON
- ✗ new game UI

These belong to subsequent iterations and are correctly NOT present in this baseline.

---

## SCOPE VIOLATIONS

**NONE**

No production features outside Iteration 0 scope were added.

---

## FINAL VALIDATION

```
✓ Actual current local source matches established core contracts
✓ Gate once-per-gacoan contract intact (tested)
✓ Visual runtime chain is real, not dead code
✓ Required background fails fast on missing texture/stage
✓ Failed boot is atomic (cleanup without DESTROYED)
✓ Normal destroy is deterministic
✓ Reset/HOLD lifecycle intact (tested)
✓ All automated regression suites PASS
✓ Build PASS
✓ Aggregate check PASS
```

---

## BASELINE REPORT SUMMARY

| Category | Result |
|----------|--------|
| Gameplay Core (A) | ✓ MATCH |
| State Machine (B) | ✓ MATCH |
| Gate Consumption (C) | ✓ PASS |
| Collision Ownership (D) | ✓ PASS |
| Visual Catalog (E) | ✓ MATCH |
| Visual Cache (F) | ✓ PASS |
| Visual Boot (G) | ✓ PASS |
| Background Failure (H) | ✓ PASS |
| Background Layer (I) | ✓ PASS |
| Boot Atomicity (J) | ✓ PASS |
| Normal Destroy (K) | ✓ PASS |
| Reset/Hold (L) | ✓ PASS |
| Package Baseline (M) | ✓ PASS |
| Test Quality (N) | ✓ PASS |
| Automated Validation | ✓ ALL PASS |
| Static Review | ✓ CLEAN |
| Scope Violations | ✓ NONE |

---

## FINAL DECISION

```
┌─────────────────────────────────────────┐
│  PASS_MD_BASELINE_LOCKED                │
│                                         │
│  Baseline reconciliation complete.      │
│  Source ready for Iteration 1.          │
│  All core contracts verified/passing.   │
│  No reconciliation patches required.    │
└─────────────────────────────────────────┘
```

**Current working repository state = TRUSTED BASELINE**

No modifications required. No features to reconcile. Ready to proceed with Iteration 1 work (level parity, targetValue, etc.).

---

**Report generated:** 2026-08-09 20:08:33 UTC+7  
**Iteration 0 Status:** COMPLETE ✓
