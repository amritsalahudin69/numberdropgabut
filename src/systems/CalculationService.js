export class CalculationService {
  static normalizeOperator(op) {
    if (op === 'x' || op === 'X') return '*';
    if (op === ':') return '/';
    return op;
  }

  static compute(a, rawOperator, b, domain = { min: 0, max: 2000 }) {
    const numA = Number(a);
    const numB = Number(b);

    if (!Number.isInteger(numA) || !Number.isInteger(numB)) {
      return { ok: false, error: `Operands must be valid integers: a=${a}, b=${b}` };
    }

    const op = CalculationService.normalizeOperator(rawOperator);

    let result;
    switch (op) {
      case '+':
        result = numA + numB;
        break;
      case '-':
        result = numA - numB;
        break;
      case '*':
        result = numA * numB;
        break;
      case '/':
        if (numB === 0) {
          return { ok: false, error: 'Division by zero' };
        }
        result = numA / numB;
        break;
      default:
        return { ok: false, error: `Unsupported operator: ${rawOperator}` };
    }

    if (!Number.isFinite(result) || Number.isNaN(result)) {
      return { ok: false, error: 'Result is not a finite number' };
    }

    if (!Number.isInteger(result)) {
      return { ok: false, error: `Non-integer result produced: ${result}` };
    }

    if (domain) {
      if (typeof domain.min === 'number' && result < domain.min) {
        return { ok: false, error: `Result ${result} below minimum domain threshold ${domain.min}` };
      }
      if (typeof domain.max === 'number' && result > domain.max) {
        return { ok: false, error: `Result ${result} exceeds maximum domain threshold ${domain.max}` };
      }
    }

    return { ok: true, value: result };
  }
}
