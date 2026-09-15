export class ResultService {
  static buildResult({ level, session, runRecorder, startedAtMs, completedAtMs }) {
    const ops = runRecorder ? runRecorder.operations.map(op => ({ ...op })) : [];
    const cols = runRecorder ? runRecorder.collisions.map(col => ({ ...col })) : [];
    const evos = runRecorder ? runRecorder.evolutions.map(evo => ({ ...evo })) : [];
    const attempts = runRecorder?.getSnapshot?.().attempts || [];
    const events = attempts.flatMap(attempt => attempt.events || []);
    const countEvents = (type) => events.filter(event => event.type === type).length;
    const countOutcomes = (outcome) => attempts.filter(attempt => attempt.outcome === outcome).length;
    const attemptsWithEvent = (type) => attempts.filter(attempt => (attempt.events || []).some(event => event.type === type)).length;
    const attemptSummary = {
      totalAttempts: attempts.length,
      successfulAttempts: countOutcomes('success'),
      failedAttempts: countOutcomes('failed'),
      outOfPlayAttempts: countOutcomes('out_of_play'),
      errorAttempts: countOutcomes('error'),
      hammerHits: countEvents('hammer-hit'),
      gearHits: countEvents('gear-hit'),
      movingBlockHits: countEvents('moving-block-hit'),
      pegHits: countEvents('peg-hit'),
      attemptsWithHammerHit: attemptsWithEvent('hammer-hit'),
      hammerThenSuccess: attempts.filter(attempt => attempt.outcome === 'success' && (attempt.events || []).some(event => event.type === 'hammer-hit')).length,
      hammerThenFailed: attempts.filter(attempt => attempt.outcome === 'failed' && (attempt.events || []).some(event => event.type === 'hammer-hit')).length,
      hammerThenOutOfPlay: attempts.filter(attempt => attempt.outcome === 'out_of_play' && (attempt.events || []).some(event => event.type === 'hammer-hit')).length,
    };

    return {
      schemaVersion: 1,
      game: 'marbledrop',
      levelId: level.id,
      
      startingValue: session.startingValue,
      targetValue: level.targetValue || (level.goals && level.goals[0] ? level.goals[0].value : 0),
      finalValue: session.currentValue,
      
      maxOps: session.maxOps,
      opsUsed: session.opsUsed,
      opsRemaining: session.getOpsRemaining(),
      
      success: session.isCompletionSuccess(),
      completionReason: session.getCompletionReason(),
      
      operations: ops,
      collisions: cols,
      evolutions: evos,
      attempts,
      attemptSummary,
      
      startedAt: startedAtMs,
      completedAt: completedAtMs,
    };
  }
}
