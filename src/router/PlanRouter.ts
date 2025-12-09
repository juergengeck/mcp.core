/**
 * PlanRouter
 * Unified router for all plan method calls
 * Integrates PolicyEngine and AuditLogger with PlanRegistry
 */

import type {
  RequestContext,
  PolicyDecision,
  PlanResult,
  CallerType,
  EntryPoint
} from './types.js';
import type { PolicyEngine } from '../policy/PolicyEngine.js';
import type { AuditLogger } from '../audit/AuditLogger.js';
import { planRegistry, type PlanRegistry } from '../tools/PlanRegistry.js';

export class PolicyDeniedError extends Error {
  public decision: PolicyDecision;

  constructor(decision: PolicyDecision) {
    super(decision.reason || 'Policy denied');
    this.name = 'PolicyDeniedError';
    this.decision = decision;
  }
}

export interface PlanRouterDependencies {
  policy: PolicyEngine;
  audit: AuditLogger;
  registry?: PlanRegistry;  // Optional, defaults to singleton
}

export class PlanRouter {
  private policy: PolicyEngine;
  private audit: AuditLogger;
  private registry: PlanRegistry;

  constructor(deps: PlanRouterDependencies) {
    this.policy = deps.policy;
    this.audit = deps.audit;
    this.registry = deps.registry || planRegistry;
  }

  /**
   * Call a plan method with full policy enforcement and audit
   */
  async call<T = any>(
    context: RequestContext,
    plan: string,
    method: string,
    params: any = {}
  ): Promise<PlanResult<T>> {
    const startTime = Date.now();

    // 1. Evaluate policy
    const decision = await this.policy.evaluate(context, plan, method, params);

    // 2. Log request (before execution)
    if (decision.audit || !decision.allowed) {
      this.audit.logRequest(
        context,
        plan,
        method,
        params,
        decision.allowed ? 'allowed' : 'denied',
        decision.matchedRules,
        decision.reason
      );
    }

    // 3. Reject if not allowed
    if (!decision.allowed) {
      throw new PolicyDeniedError(decision);
    }

    // 4. Apply param filtering if needed
    const safeParams = decision.filteredParams ?? params;

    // 5. Execute plan method
    try {
      const result = await this.registry.callPlanMethod(plan, method, safeParams);
      const executionTimeMs = Date.now() - startTime;

      // 6. Log success
      if (decision.audit) {
        await this.audit.logResult(context.requestId, true, executionTimeMs);
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log failure
      if (decision.audit) {
        await this.audit.logResult(context.requestId, false, executionTimeMs, errorMessage);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Create a request context
   * Helper for adapters
   */
  static createContext(params: {
    callerId: string;
    callerType: CallerType;
    entryPoint: EntryPoint;
    topicId?: string;
    conversationId?: string;
    credentialId?: string;
  }): RequestContext {
    return {
      callerId: params.callerId,
      callerType: params.callerType,
      entryPoint: params.entryPoint,
      topicId: params.topicId,
      conversationId: params.conversationId,
      credentialId: params.credentialId,
      timestamp: Date.now(),
      requestId: crypto.randomUUID()
    };
  }

  /**
   * Get the underlying registry for plan discovery
   */
  getRegistry(): PlanRegistry {
    return this.registry;
  }

  /**
   * Get the policy engine for rule management
   */
  getPolicy(): PolicyEngine {
    return this.policy;
  }

  /**
   * Get the audit logger for querying logs
   */
  getAudit(): AuditLogger {
    return this.audit;
  }
}

export default PlanRouter;
