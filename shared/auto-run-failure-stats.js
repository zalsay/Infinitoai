(function(root, factory) {
  const exports = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }

  root.AutoRunFailureStats = exports;
})(typeof globalThis !== 'undefined' ? globalThis : self, function() {
  const MAX_RECENT_LOGS = 3;
  const MAX_RECENT_SUCCESS_DURATIONS = 20;

  function sanitizeCounter(value) {
    const numeric = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function sanitizeDurationMs(value) {
    const numeric = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function normalizeRecentSuccessDurations(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    const normalized = [];
    for (const value of values) {
      const durationMs = sanitizeDurationMs(value);
      if (!durationMs) {
        continue;
      }
      normalized.push(durationMs);
      if (normalized.length >= MAX_RECENT_SUCCESS_DURATIONS) {
        break;
      }
    }

    return normalized;
  }

  function normalizeStep(step, message) {
    const parsedStep = Number.parseInt(String(step ?? '').trim(), 10);
    if (Number.isFinite(parsedStep) && parsedStep > 0) {
      return parsedStep;
    }
    const stepMatch = String(message || '').match(/step\s+(\d+)/i);
    return stepMatch ? Number.parseInt(stepMatch[1], 10) : 0;
  }

  function normalizeReason(message) {
    let reason = String(message || '').trim();
    if (!reason) {
      return 'Unknown failure';
    }

    reason = reason
      .replace(/^run\s+\S+\s+failed:\s*/i, '')
      .replace(/^step\s+\d+\s+failed:\s*/i, '')
      .replace(/\s+url:\s*https?:\/\/\S+/i, '')
      .replace(/\bafter\s+\d+\s+attempts?\b/gi, 'after N attempts')
      .replace(/\s+/g, ' ')
      .trim();

    return reason.replace(/[.。]+$/, '').trim() || 'Unknown failure';
  }

  function normalizeRecentLogs(logs) {
    if (!Array.isArray(logs)) {
      return [];
    }

    const normalized = [];
    for (const entry of logs) {
      const message = String(entry || '').trim();
      if (!message || normalized.includes(message)) continue;
      normalized.push(message);
      if (normalized.length >= MAX_RECENT_LOGS) break;
    }
    return normalized;
  }

  function normalizeFailureBucket(bucket) {
    const step = normalizeStep(bucket?.step, bucket?.reason || bucket?.key || '');
    const reason = normalizeReason(bucket?.reason || '');
    return {
      key: String(bucket?.key || `step-${step || 'unknown'}::${reason.toLowerCase()}`),
      step,
      reason,
      count: sanitizeCounter(bucket?.count),
      lastRunLabel: typeof bucket?.lastRunLabel === 'string' ? bucket.lastRunLabel : '',
      lastSeenAt: Number.isFinite(bucket?.lastSeenAt) ? bucket.lastSeenAt : 0,
      recentLogs: normalizeRecentLogs(bucket?.recentLogs),
    };
  }

  function normalizeAutoRunStats(stats = {}) {
    const successfulRuns = Math.max(0, Number.parseInt(String(stats.successfulRuns ?? 0), 10) || 0);
    const failedRuns = Math.max(0, Number.parseInt(String(stats.failedRuns ?? 0), 10) || 0);
    const totalSuccessfulDurationMs = sanitizeDurationMs(stats.totalSuccessfulDurationMs);
    const recentSuccessDurationsMs = normalizeRecentSuccessDurations(stats.recentSuccessDurationsMs);
    const failureBuckets = Array.isArray(stats.failureBuckets)
      ? stats.failureBuckets.map(normalizeFailureBucket).filter((bucket) => bucket.count > 0)
      : [];

    return {
      successfulRuns,
      failedRuns,
      totalSuccessfulDurationMs,
      recentSuccessDurationsMs,
      failureBuckets,
    };
  }

  function buildFailureBucketKey(step, reason) {
    return `step-${step || 'unknown'}::${String(reason || '').trim().toLowerCase()}`;
  }

  function recordAutoRunFailure(stats = {}, failure = {}) {
    const normalizedStats = normalizeAutoRunStats(stats);
    const step = normalizeStep(failure.step, failure.errorMessage);
    const reason = normalizeReason(failure.errorMessage);
    const key = buildFailureBucketKey(step, reason);
    const logMessage = String(failure.logMessage || failure.errorMessage || '').trim();
    const timestamp = Number.isFinite(failure.timestamp) ? failure.timestamp : Date.now();
    const lastRunLabel = typeof failure.runLabel === 'string' ? failure.runLabel : '';

    let matched = false;
    const failureBuckets = normalizedStats.failureBuckets.map((bucket) => {
      if (bucket.key !== key) {
        return bucket;
      }
      matched = true;
      return normalizeFailureBucket({
        ...bucket,
        count: bucket.count + 1,
        lastRunLabel,
        lastSeenAt: timestamp,
        recentLogs: [logMessage, ...bucket.recentLogs],
      });
    });

    if (!matched) {
      failureBuckets.push(normalizeFailureBucket({
        key,
        step,
        reason,
        count: 1,
        lastRunLabel,
        lastSeenAt: timestamp,
        recentLogs: [logMessage],
      }));
    }

    return {
      successfulRuns: normalizedStats.successfulRuns,
      failedRuns: normalizedStats.failedRuns + 1,
      totalSuccessfulDurationMs: normalizedStats.totalSuccessfulDurationMs,
      recentSuccessDurationsMs: normalizedStats.recentSuccessDurationsMs,
      failureBuckets,
    };
  }

  function recordAutoRunSuccess(stats = {}, success = {}) {
    const normalizedStats = normalizeAutoRunStats(stats);
    const durationMs = sanitizeDurationMs(success.durationMs);

    return {
      successfulRuns: normalizedStats.successfulRuns + 1,
      failedRuns: normalizedStats.failedRuns,
      totalSuccessfulDurationMs: normalizedStats.totalSuccessfulDurationMs + durationMs,
      recentSuccessDurationsMs: normalizeRecentSuccessDurations([
        durationMs,
        ...normalizedStats.recentSuccessDurationsMs,
      ]),
      failureBuckets: normalizedStats.failureBuckets,
    };
  }

  function summarizeAutoRunFailureBuckets(stats = {}) {
    return normalizeAutoRunStats(stats).failureBuckets.slice().sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      if (right.lastSeenAt !== left.lastSeenAt) {
        return right.lastSeenAt - left.lastSeenAt;
      }
      return left.step - right.step;
    });
  }

  return {
    normalizeAutoRunStats,
    recordAutoRunFailure,
    recordAutoRunSuccess,
    summarizeAutoRunFailureBuckets,
  };
});
