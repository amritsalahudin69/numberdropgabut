# TSA MARBLEDROP STANDALONE
## ITERATION 4 — LIFECYCLE HARDENING / REPEATED RUNTIME / LEAK & STALE EVENT DEFENSE
### PRECONDITION — LOCKED
Required previous gates:

```text
PASS_MD_STANDALONE_FOUNDATION
PASS_MD_CORE_GAMEPLAY
PASS_MD_ITER3_STATE_CORRECTION
```

Current canonical lifecycle:

```text
READY
→ FALLING
→ RESOLVING
→ HOLDING
→ FALLING        // gate

READY
→ FALLING
→ RESOLVING
→ HOLDING
→ CLEANUP        // goal
→ READY/SUMMARY
```

Forbidden transition:

```text
CLEANUP → HOLDING
```

CollisionResolver owns arithmetic only.

MarbleDropGame owns gameplay lifecycle.

MarbleDropSession owns state.

Do NOT redesign these contracts.

---

# 1. ENVIRONMENT

```text
Project:
C:\Users\HP\Documents\project\muerbledrop

Shell:
Windows PowerShell

npm:
Windows PowerShell

Agent:
Antigravity CLI

WSL:
FORBIDDEN
```

---

# 2. TSA MODE

Use:

```text
Mode 2 — Feature Patch / Runtime Hardening
```

Execution:

```text
READ CURRENT IMPLEMENTATION
→ TARGETED LIFECYCLE AUDIT
→ IDENTIFY OWNERSHIP COUNTS
→ IMPLEMENT HARDENING
→ BEHAVIORAL STRESS TEST
→ FULL REGRESSION
→ BUILD
→ RUNTIME SMOKE
→ REPORT
→ STOP
```

No full-repo scan.

Do not modify unrelated modules.

---

# 3. OBJECTIVE

Iteration 4 adds NO new gameplay feature.

Its only purpose is proving that the game can repeatedly:

```text
drop
collide
hold
resume
cleanup
reset
drop again
```

without accumulating:

```text
stale gacoans
stale rigid bodies
stale colliders
stale collision registrations
stale feedback DOM
stale hold state
duplicated level entities
duplicated pointer handlers
duplicated ticker/update handlers
duplicate arithmetic
old-session events
```

---

# 4. NON-NEGOTIABLE INVARIANTS

At runtime there may be:

```text
0 or 1 active gacoan
```

Never:

```text
2+
```

There must be exactly one logical Level 1 instance.

After cleanup/reset:

```text
activeGacoan = null
feedback visible = false
hold context = null
```

Collision registry must contain only currently alive registered colliders.

Destroyed entity collider handles must not remain registered.

---

# 5. ENTITY OWNERSHIP

MarbleDropGame owns Level 1 entity collections:

```text
pegs
gates
goals
active gacoan
```

Each entity:

```text
created once
→ registered once
→ destroyed once
```

`destroy()` must remain idempotent.

Calling:

```js
entity.destroy()
entity.destroy()
```

must not:

```text
throw
double-remove Rapier objects
double-remove Pixi objects
corrupt registry
```

---

# 6. COLLISION REGISTRY HARDENING

Audit:

```text
src/core/CollisionRegistry.js
```

Required behavior:

```text
register(handle, metadata)
unregister(handle)
get(handle)
clear()
getCount()
```

Add `getCount()` if not already available.

Rules:

```text
duplicate registration of same live handle
→ deterministic rejection or explicit replacement policy
```

Do not silently multiply logical registrations.

After gacoan cleanup:

```text
old gacoan collider handle
→ registry.get(handle) === null/undefined
```

After reset:

```text
registry count
===
expected static Level 1 collider count
```

No old active gacoan collider remains.

---

# 7. STATIC LEVEL ENTITY COUNT

Level 1 contains:

```text
Pegs  : 10
Gates : 3
Goals : 5
```

Therefore expected static entity counts after each rebuild must remain exactly:

```text
pegs  = 10
gates = 3
goals = 5
```

Do not rely solely on sprite count.

Validate logical entity arrays and collider registry ownership.

Repeated reset must NOT produce:

```text
20 pegs
6 gates
10 goals
```

or equivalent duplicates.

---

# 8. RESET CONTRACT

There must remain ONE public reset path:

```js
game.reset()
```

Required order:

```text
1. stop accepting current collision processing

2. clear feedback

3. clear hold context

4. unregister active gacoan collider

5. destroy active gacoan

6. destroy level entities

7. clear registry

8. reset session

9. rebuild Level 1 ONCE

10. READY
```

Do not invoke level rebuild from:

```text
PhysicsWorld readiness
ticker callback
async texture callback
DOM feedback callback
```

One reset = one rebuild.

---

# 9. RESET IDEMPOTENCY

These must all be valid:

```js
reset()
reset()
reset()
```

even when called rapidly.

Test from:

```text
READY
FALLING
RESOLVING
HOLDING
CLEANUP
```

When a reset is validly requested, final state must deterministically become:

```text
READY
```

with exactly one Level 1 instance.

---

# 10. OLD SESSION EVENT DEFENSE

A collision event associated with an old/destroyed gacoan must never modify the current session.

Implement this through actual ownership validation.

Before processing an operation collision verify:

```text
session state is valid
AND
session.activeGacoan exists
AND
collision gacoan identity === session.activeGacoan
AND
entity is not destroyed
AND
collider is still registered
```

Do NOT introduce arbitrary `sessionToken` workaround unless absolutely required.

Prefer identity + lifecycle ownership.

Old collider events after unregister must become harmless.

---

# 11. COLLISION BATCH RESET SAFETY

Potential case:

```text
physics step
→ collision events collected
→ first event triggers reset/cleanup
→ remaining events belong to old entities
```

The remaining events must not mutate the new session.

Required:

```text
each event revalidates live entity/session ownership before commit
```

Do not assume all events in one batch remain valid.

---

# 12. DUPLICATE OPERATION DEFENSE

One contact start:

```text
→ one arithmetic commit
```

During:

```text
RESOLVING
HOLDING
CLEANUP
```

additional operation events must not mutate value.

Example:

```text
100
hits -1 once
```

Expected:

```text
99
```

Never:

```text
98
97
...
```

from the same overlap/contact.

---

# 13. POINTER INPUT HARDENING

Audit pointer/drop listener ownership.

MarbleDropGame must not add a new pointer handler on every:

```text
reset
start
rebuild
```

Required:

```text
one active pointer/drop listener
```

Lifecycle:

```text
init/start
→ attach once

destroy
→ detach once
```

Reset must NOT reattach duplicate listener unless explicitly detached first.

---

# 14. UPDATE/TICKER HARDENING

Audit Pixi/Vite/game loop integration.

There must be:

```text
one active gameplay update callback
```

Repeated:

```text
reset()
```

must not create additional ticker/update callbacks.

`destroy()` must detach the callback.

If `start()` can be called twice:

```text
second start
→ no duplicate ticker
```

Use explicit lifecycle flags.

---

# 15. FEEDBACK DOM HARDENING

At any moment:

```text
feedback DOM count <= 1
```

Repeated collisions:

```text
show
clear
show
clear
```

must reuse/remove deterministically.

After reset:

```text
feedback visible = false
```

After destroy:

```text
feedback DOM = removed
```

No orphan `<img>` elements.

---

# 16. HOLD CONTEXT HARDENING

While HOLDING there is exactly one hold context.

After:

```text
gate hold completion
goal hold completion
reset
destroy
```

hold context must be cleared.

Forbidden state:

```text
state = READY
holdContext != null
```

Forbidden state:

```text
activeGacoan = null
state = HOLDING
```

These are invariant errors.

---

# 17. GACOAN CLEANUP CONTRACT

Cleanup must perform exactly:

```text
registry.unregister(gacoanCollider)

physics body/collider destroy

PIXI sprite destroy/remove

session.clearActiveGacoan()
```

or equivalent canonical ownership path.

After cleanup:

```text
active gacoan count = 0
```

No stale body.

No stale sprite.

No stale registry entry.

---

# 18. DIAGNOSTIC SNAPSHOT

Extend current read-only diagnostic if needed.

Required snapshot:

```js
{
  appState,
  gameState,

  currentValue,

  opsUsed,
  opsRemaining,

  activeGacoanCount,

  pegCount,
  gateCount,
  goalCount,

  collisionRegistryCount,

  feedbackVisible,

  holding,

  pointerListenerCount,
  updateLoopCount
}
```

If exact browser listener count cannot be queried safely, maintain explicit internal ownership flags/counts.

Diagnostic is observation only.

It may not mutate gameplay.

---

# 19. DESTROY CONTRACT

`game.destroy()` must be idempotent.

Required:

```text
clear feedback
clear hold
remove pointer listener
remove ticker/update callback
destroy active gacoan
destroy pegs
destroy gates
destroy goals
clear registry
destroy texture ownership if owned by game
session.destroy()
```

Second `destroy()`:

```text
no throw
no duplicate removal
```

After DESTROYED:

```text
dropAt()
update()
reset()
```

must either:

```text
reject explicitly
```

or safely no-op according to one consistent contract.

Do not resurrect destroyed game automatically.

---

# 20. MARBLEDROP APP DESTROY

Audit:

```text
MarbleDropApp.destroy()
```

Ensure child destruction order is deterministic.

Recommended:

```text
MarbleDropGame.destroy()
→ NumberTextureCache.destroy()
→ AssetService.destroy()
→ PhysicsWorld.destroy()
→ Renderer.destroy()
```

Use actual ownership implemented by repo.

Do not double-destroy resources owned elsewhere.

---

# 21. NO NEW FEATURE

Forbidden in Iteration 4:

```text
new level
Auto Mode
score
summary redesign
sound feature
new visual effects
background redesign
new operation type
new asset convention
new state
new game mode
```

No gameplay behavior change unless required to fix lifecycle correctness.

---

# 22. TEST — REPEATED RESET

Create or extend:

```text
tests/restart-cleanup.test.mjs
```

Execute at least:

```text
50 sequential resets
```

After every reset verify:

```text
state = READY

activeGacoanCount = 0

pegCount = 10
gateCount = 3
goalCount = 5

feedbackVisible = false

holdContext = null

pointer listener count = 1

update loop count = 1
```

Collision registry static count must remain constant.

Do not assert an invented number if actual collider composition differs.

Capture baseline after first valid build:

```text
baselineRegistryCount
```

Then every reset:

```text
registryCount === baselineRegistryCount
```

---

# 23. TEST — REPEATED DROP/CLEANUP

Perform at least:

```text
50 drop → cleanup cycles
```

Use deterministic fake/test seams where necessary.

Each cycle:

```text
READY
→ drop
→ FALLING
→ cleanup
→ READY
```

After each cycle:

```text
active gacoan count = 0
registry count = baseline static count
```

No growth over time.

---

# 24. TEST — REPEATED GATE HOLD

Perform at least:

```text
25 gate operation cycles
```

Each operation:

```text
FALLING
→ RESOLVING
→ HOLDING
→ FALLING
```

Verify:

```text
exactly one arithmetic commit
feedback cleaned
hold context cleaned
same active gacoan continues
```

Do not wait real 5 seconds.

Use fake clock.

---

# 25. TEST — GOAL HOLD CLEANUP

Perform repeated goal flow:

```text
FALLING
→ RESOLVING
→ HOLDING
→ CLEANUP
→ READY/SUMMARY
```

At least:

```text
20 cycles/reset combinations
```

Verify after each cleanup:

```text
no active gacoan
old collider not registered
feedback false
hold null
goal entity remains valid until level reset
```

---

# 26. TEST — RESET DURING HOLDING

At least:

```text
20 repetitions
```

Flow:

```text
drop
→ operation
→ HOLDING
→ reset
```

Then advance fake clock far beyond hold:

```text
+60 seconds
```

Expected:

```text
READY
no feedback
no old gacoan
no old operation
no stale mutation
```

---

# 27. TEST — RESET DURING FALLING

Flow:

```text
drop
→ FALLING
→ reset
```

Repeat:

```text
20 times
```

After each:

```text
READY
activeGacoanCount = 0
registry = baseline
```

---

# 28. TEST — STALE COLLISION EVENT

Create a behavioral test:

```text
spawn gacoan A
capture collider/event identity

reset

spawn/new session

submit/process old collision event from A
```

Expected:

```text
current session unchanged
currentValue unchanged
no HOLDING
no feedback
no exception caused by stale body
```

Then a valid current gacoan event must still work.

---

# 29. TEST — DUPLICATE CONTACT

Feed equivalent duplicate operation start event for same active contact.

Expected:

```text
one resolution only
```

Example:

```text
100 - 1
→ 99
```

Never:

```text
98
```

before contact ends/new contact starts.

---

# 30. TEST — DESTROY IDEMPOTENCY

Execute:

```js
game.destroy()
game.destroy()
```

Expected:

```text
no throw
```

Verify:

```text
pointer listener = 0
update loop = 0
active gacoan = 0
feedback = false
registry = 0
session state = DESTROYED
```

---

# 31. TEST FILE

Create:

```text
tests/lifecycle-hardening.test.mjs
```

Keep focused lifecycle tests there.

Do not replace existing test suites.

Do not use:

```text
source.includes()
regex source inspection
```

Behavior only.

---

# 32. PACKAGE SCRIPT

Add:

```json
{
  "test:lifecycle": "node tests/lifecycle-hardening.test.mjs"
}
```

Aggregate validation must include:

```text
assets:index
assets:validate
assets:level
test:foundation
test:core
test:feedback
test:lifecycle
build
```

---

# 33. REQUIRED POWERSHELL VALIDATION

Run:

```powershell
cd C:\Users\HP\Documents\project\muerbledrop

npm run assets:index
npm run assets:validate
npm run assets:level

npm run test:foundation
npm run test:core
npm run test:feedback
npm run test:lifecycle

npm run build
```

Then:

```powershell
npm run dev
```

No WSL.

---

# 34. RUNTIME SMOKE — MANUAL

In browser verify:

## Boot

```text
READY
10 pegs
3 gates
5 goals
```

## Repeated reset

Execute:

```js
for (let i = 0; i < 20; i++) {
  window.__MARBLEDROP_APP__.reset()
}
```

Afterward snapshot must still show:

```text
READY
activeGacoanCount = 0
pegCount = 10
gateCount = 3
goalCount = 5
one level instance
```

## Drop after resets

Drop must still work normally.

## Gate after resets

Arithmetic must still resolve exactly once.

## Feedback

GIF/PNG feedback must still display/clear correctly.

---

# 35. DO NOT PATCH BY SYMPTOM

If stress test fails:

```text
collect failures
→ group by ownership/root cause
→ fix root cause
→ rerun complete lifecycle suite
```

Do NOT create:

```text
if resetCount > ...
if duplicate then hide it
arbitrary delay
extra debounce timer
sessionToken patch
try/catch swallowing stale errors
```

unless ownership analysis proves that mechanism is required.

---

# 36. REGRESSION REQUIREMENT

Everything previously working must remain working:

```text
asset index
asset validation
reachable value coverage
boot
manual drop
peg physics
gate arithmetic
goal arithmetic
goal immutability
PNG transformation
GIF feedback
PNG feedback fallback
5-second HOLDING
gate resume
goal cleanup
reset during HOLDING
single source of truth
```

No regression may be accepted as lifecycle hardening.

---

# 37. REQUIRED REPORT

Return:

```text
TSA MARBLEDROP ITERATION 4

Files created:
- ...

Files modified:
- ...

Lifecycle stress:

50 resets:
PASS/FAIL

50 drop-cleanup cycles:
PASS/FAIL

25 gate hold cycles:
PASS/FAIL

20 goal cleanup cycles:
PASS/FAIL

20 reset-during-hold cycles:
PASS/FAIL

20 reset-during-fall cycles:
PASS/FAIL

Stale collision event:
PASS/FAIL

Duplicate contact:
PASS/FAIL

Double destroy:
PASS/FAIL

Counts after stress:
pegs:
gates:
goals:
active gacoans:
registry baseline:
registry final:
pointer listeners:
update loops:
feedback visible:
hold context:

Leak detection:
stale gacoan: NONE/FOUND
stale collider: NONE/FOUND
stale registry entry: NONE/FOUND
stale feedback: NONE/FOUND
duplicate level entity: NONE/FOUND
duplicate input handler: NONE/FOUND
duplicate update handler: NONE/FOUND

Regression:
assets:index: PASS/FAIL
assets:validate: PASS/FAIL
assets:level: PASS/FAIL
foundation: PASS/FAIL
core: PASS/FAIL
feedback: PASS/FAIL
lifecycle: PASS/FAIL
build: PASS/FAIL

Runtime smoke:
PASS/FAIL

Scope violations:
NONE
or exact list

Final verdict:
PASS_MD_LIFECYCLE_HARDENING
or
FAIL_MD_LIFECYCLE_HARDENING
```

---

# 38. STOP CONDITION

PASS only if:

```text
no entity growth
+
no collider growth
+
no registry growth
+
no DOM feedback growth
+
no listener growth
+
no update-loop growth
+
no stale collision mutation
+
no duplicate arithmetic
+
reset works from active lifecycle states
+
destroy is idempotent
+
all previous tests remain PASS
+
build remains PASS
+
runtime remains playable
```

Final success token:

```text
PASS_MD_LIFECYCLE_HARDENING
```

STOP.

Do NOT implement Iteration 5.