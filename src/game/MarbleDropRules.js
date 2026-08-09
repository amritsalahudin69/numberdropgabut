import { CalculationService } from '../systems/CalculationService.js';

export class MarbleDropRules {
  static validateLevelConfig(level) {
    if (!level || typeof level !== 'object') {
      throw new Error('Level config must be an object');
    }
    if (!level.id) throw new Error('Level config missing id');
    if (typeof level.startingValue !== 'number') throw new Error('Level config missing startingValue');
    if (!Array.isArray(level.pegs)) throw new Error('Level config missing pegs array');
    if (!Array.isArray(level.gates)) throw new Error('Level config missing gates array');
    if (!Array.isArray(level.goals)) throw new Error('Level config missing goals array');
    return true;
  }

  static canDropMore(opsUsed, maxOps) {
    return opsUsed < maxOps;
  }

  static getReachableValues(level) {
    MarbleDropRules.validateLevelConfig(level);

    const reachable = new Set();
    const domain = level.valueDomain || { min: 0, max: 2000 };

    const startingVal = level.startingValue;
    reachable.add(startingVal);

    // Breadth-first exploration of possible arithmetic transformations over maxOps steps
    let currentSet = new Set([startingVal]);

    for (let step = 0; step < level.maxOps; step++) {
      const nextSet = new Set();

      for (const val of currentSet) {
        // Apply all gate operations
        for (const gate of level.gates) {
          const res = CalculationService.compute(val, gate.operator, gate.operand, domain);
          if (res.ok) {
            reachable.add(res.value);
            nextSet.add(res.value);
          }
        }

        // Apply all goal operations
        for (const goal of level.goals) {
          const op = goal.operator || '-';
          const res = CalculationService.compute(val, op, goal.value, domain);
          if (res.ok) {
            reachable.add(res.value);
            nextSet.add(res.value);
          }
        }
      }

      if (nextSet.size === 0) break;
      currentSet = nextSet;
    }

    return Array.from(reachable).sort((a, b) => a - b);
  }

  // Compute required static numeric asset values for a given level.
  // Required = reachable arithmetic results ∪ startingValue ∪ goal values ∪ gate operands
  // Include level.targetValue only if present (do not add when missing).
  static getRequiredNumberAssetValues(level) {
    MarbleDropRules.validateLevelConfig(level);

    const values = new Set();

    // Starting value
    if (typeof level.startingValue === 'number') values.add(level.startingValue);

    // Goals
    for (const g of level.goals) {
      if (typeof g.value === 'number') values.add(g.value);
    }

    // Gate operands
    for (const gate of level.gates) {
      if (typeof gate.operand === 'number') values.add(gate.operand);
    }

    // Reachable results
    try {
      const reachable = MarbleDropRules.getReachableValues(level);
      for (const v of reachable) values.add(v);
    } catch (e) {
      // If reachable computation fails, rethrow
      throw e;
    }

    // targetValue only if present
    if (Object.prototype.hasOwnProperty.call(level, 'targetValue') && typeof level.targetValue === 'number') {
      values.add(level.targetValue);
    }

    return Array.from(values).sort((a, b) => a - b);
  }
}
