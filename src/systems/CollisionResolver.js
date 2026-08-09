import { CalculationService } from './CalculationService.js';
import { GAMEPLAY_STATE } from '../game/MarbleDropSession.js';

export class CollisionResolver {
  constructor({ session, textureCache, assetService, levelDomain } = {}) {
    this.session = session;
    this.textureCache = textureCache;
    this.assetService = assetService;
    this.levelDomain = levelDomain || { min: 0, max: 2000 };
  }

  resolveOperationHit({ operator, operand, isGoal = false }) {
    if (!this.session) {
      throw new Error('CollisionResolver requires a valid MarbleDropSession');
    }

    // Resolver must be invoked while session is in RESOLVING state (caller must call beginResolve())
    if (this.session.getState() !== GAMEPLAY_STATE.RESOLVING) {
      return { ok: false, reason: `Ignored collision hit: session state is ${this.session.getState()}` };
    }

    const gacoan = this.session.getActiveGacoan();
    if (!gacoan) {
      throw new Error('CollisionResolver error: No active gacoan found during FALLING state');
    }

    // Do not change session state here; let caller (game) control RESOLVING→HOLDING transitions
    // this.session.beginResolve();

    const previousValue = this.session.getCurrentValue();

    // Calculate arithmetic result
    const calcResult = CalculationService.compute(
      previousValue,
      operator,
      operand,
      this.levelDomain
    );

    if (!calcResult.ok) {
      this.session.transitionTo(GAMEPLAY_STATE.ERROR);
      throw new Error(`Arithmetic calculation failed (${previousValue} ${operator} ${operand}): ${calcResult.error}`);
    }

    const nextValue = calcResult.value;

    // Obtain PRELOADED PNG texture from NumberTextureCache — must be synchronous
    let nextTexture;
    try {
      if (!this.textureCache) {
        throw new Error('NumberTextureCache missing from CollisionResolver');
      }
      nextTexture = this.textureCache.get(nextValue);
    } catch (cacheErr) {
      this.session.transitionTo(GAMEPLAY_STATE.ERROR);
      throw new Error(`Texture lookup failed for result ${nextValue}: ${cacheErr.message}`);
    }

    // Commit state transaction atomically
    this.session.currentValue = nextValue;
    gacoan.setValue(nextValue, nextTexture);

    // Verify invariant
    if (this.session.getCurrentValue() !== gacoan.value) {
      this.session.transitionTo(GAMEPLAY_STATE.ERROR);
      throw new Error(`Invariant violation: session.currentValue (${this.session.getCurrentValue()}) !== gacoan.value (${gacoan.value})`);
    }

    // Resolver MUST NOT change session lifecycle. Caller (game) is responsible for hold/cleanup transitions.

    // Resolve feedback asset via AssetService (single canonical GIF→PNG decision point)
    let feedbackAsset = null;
    if (this.assetService && typeof this.assetService.getFeedbackAsset === 'function') {
      try {
        const raw = this.assetService.getFeedbackAsset(nextValue);
        // Attach fallback URL for runtime GIF load failure handling
        feedbackAsset = {
          type: raw.type,
          url: raw.url,
          fallbackUrl: raw.type === 'gif' ? this.assetService.getStaticUrl(nextValue) : null,
        };
      } catch (e) {
        console.error('[CollisionResolver] feedbackAsset resolution failed:', e);
        feedbackAsset = null;
      }
    }

    const postHoldAction = isGoal ? 'CLEANUP' : 'RESUME_FALL';

    return {
      ok: true,
      previousValue,
      nextValue,
      value: nextValue,
      source: isGoal ? 'goal' : 'gate',
      feedbackAsset,
      postHoldAction,
    };
  }
}
