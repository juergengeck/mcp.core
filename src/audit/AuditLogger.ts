/**
 * AuditLogger
 * Logs all plan method calls to ONE.core for audit trail
 */

import type {
  RequestContext,
  AuditEntry,
  AuditEntryObject,
  CallerType,
  EntryPoint
} from '../router/types.js';

export interface AuditLoggerDependencies {
  // ONE.core storage
  storeEntry: (entry: AuditEntryObject) => Promise<void>;
  queryEntries: (filter: AuditFilter) => Promise<AuditEntryObject[]>;
}

export interface AuditFilter {
  startTime?: number;
  endTime?: number;
  callerId?: string;
  callerType?: CallerType;
  entryPoint?: EntryPoint;
  plan?: string;
  method?: string;
  topicId?: string;
  decision?: 'allowed' | 'denied';
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  private deps: AuditLoggerDependencies;
  private buffer: AuditEntryObject[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(deps: AuditLoggerDependencies) {
    this.deps = deps;
  }

  /**
   * Initialize the audit logger
   */
  async init(): Promise<void> {
    // Start periodic flush
    this.scheduleFlush();
    console.log('[AuditLogger] Initialized');
  }

  /**
   * Shutdown - flush remaining entries
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
    console.log('[AuditLogger] Shutdown complete');
  }

  /**
   * Log a request before execution
   */
  logRequest(
    context: RequestContext,
    plan: string,
    method: string,
    params: any,
    decision: 'allowed' | 'denied',
    matchedRules: string[],
    denyReason?: string
  ): string {
    const entry: AuditEntryObject = {
      $type$: 'AuditEntry',
      id: context.requestId,
      timestamp: context.timestamp,
      requestId: context.requestId,
      callerId: context.callerId,
      callerType: context.callerType,
      entryPoint: context.entryPoint,
      plan,
      method,
      params: this.redactSensitive(params),
      topicId: context.topicId,
      credentialId: context.credentialId,
      decision,
      denyReason,
      matchedRules: JSON.stringify(matchedRules)
    };

    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.BUFFER_SIZE) {
      this.flush().catch(err => {
        console.error('[AuditLogger] Flush error:', err);
      });
    }

    return entry.id;
  }

  /**
   * Update an existing entry with execution result
   */
  async logResult(
    requestId: string,
    success: boolean,
    executionTimeMs: number,
    error?: string
  ): Promise<void> {
    // Find in buffer first
    const entry = this.buffer.find(e => e.id === requestId);
    if (entry) {
      entry.success = success;
      entry.executionTimeMs = executionTimeMs;
      entry.error = error;
    }
    // If not in buffer, it's already flushed - would need to update in storage
    // For now, we'll log a new entry or skip
  }

  /**
   * Query audit entries
   */
  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    // Flush buffer first to ensure complete results
    await this.flush();

    const entries = await this.deps.queryEntries(filter);

    return entries.map(obj => ({
      id: obj.id,
      timestamp: obj.timestamp,
      requestId: obj.requestId,
      callerId: obj.callerId,
      callerType: obj.callerType,
      entryPoint: obj.entryPoint,
      plan: obj.plan,
      method: obj.method,
      params: JSON.parse(obj.params),
      topicId: obj.topicId,
      credentialId: obj.credentialId,
      decision: obj.decision,
      denyReason: obj.denyReason,
      executionTimeMs: obj.executionTimeMs,
      success: obj.success,
      error: obj.error,
      matchedRules: JSON.parse(obj.matchedRules)
    }));
  }

  /**
   * Flush buffer to storage
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0, this.buffer.length);

    for (const entry of entries) {
      try {
        await this.deps.storeEntry(entry);
      } catch (err) {
        console.error('[AuditLogger] Failed to store entry:', err);
        // Put back failed entries
        this.buffer.unshift(entry);
      }
    }
  }

  /**
   * Schedule periodic flush
   */
  private scheduleFlush(): void {
    this.flushTimer = setTimeout(() => {
      this.flush().catch(err => {
        console.error('[AuditLogger] Periodic flush error:', err);
      });
      this.scheduleFlush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Redact sensitive data from params
   */
  private redactSensitive(params: any): string {
    if (!params) {
      return '{}';
    }

    const redacted = { ...params };

    // Redact common sensitive fields
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'privateKey'];
    for (const key of sensitiveKeys) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }

    // Truncate large values
    for (const [key, value] of Object.entries(redacted)) {
      if (typeof value === 'string' && value.length > 1000) {
        redacted[key] = value.substring(0, 1000) + '...[truncated]';
      }
    }

    return JSON.stringify(redacted);
  }
}

export default AuditLogger;
