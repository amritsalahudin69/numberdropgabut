export class ResultService {
  static buildResult({ level, session, runRecorder, startedAtMs, completedAtMs }) {
    const ops = runRecorder ? runRecorder.operations.map(op => ({ ...op })) : [];
    const cols = runRecorder ? runRecorder.collisions.map(col => ({ ...col })) : [];
    const evos = runRecorder ? runRecorder.evolutions.map(evo => ({ ...evo })) : [];

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
      
      startedAt: startedAtMs,
      completedAt: completedAtMs,
    };
  }
}
