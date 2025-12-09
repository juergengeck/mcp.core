/**
 * PolicyEngine
 * Central policy enforcement using Supply/Demand pattern
 *
 * Supplies: Define what access is available (created by Node.js owner)
 * Demands: Requests for access (created when caller invokes a plan method)
 *
 * Stores supplies in ONE.core and supports hot reload via cube.core
 */

import type {
  RequestContext,
  PolicyDecision,
  PolicySupplyObject,
  PolicyDemandObject,
  PolicyAction,
  CallerType,
  EntryPoint,
  RateLimitInfo
} from '../router/types.js';

/**
 * In-memory representation of a supply (for fast matching)
 */
export interface PolicySupply {
  id: string;
  name: string;
  priority: number;
  plans?: string[];
  methods?: string[];
  allowedCallerTypes?: CallerType[];
  allowedEntryPoints?: EntryPoint[];
  allowedTopics?: string[];
  action: PolicyAction;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyBy: 'caller' | 'topic' | 'method' | 'plan';
  };
}

export interface PolicyEngineDependencies {
  // ONE.core storage functions
  storeSupply: (supply: PolicySupplyObject) => Promise<void>;
  loadSupplies: () => Promise<PolicySupplyObject[]>;
  deleteSupply: (supplyId: string) => Promise<void>;

  // Demand logging (audit trail)
  storeDemand: (demand: PolicyDemandObject) => Promise<void>;

  // Optional: callback when supplies change (for cube.core integration)
  onSuppliesChanged?: (callback: () => void) => () => void;
}

export class PolicyEngine {
  private supplies: Map<string, PolicySupply> = new Map();
  private sortedSupplies: PolicySupply[] = [];
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private deps: PolicyEngineDependencies;
  private unsubscribe?: () => void;

  constructor(deps: PolicyEngineDependencies) {
    this.deps = deps;
  }

  /**
   * Initialize the policy engine - load supplies from ONE.core
   */
  async init(): Promise<void> {
    await this.loadSupplies();

    // Subscribe to supply changes if callback provided
    if (this.deps.onSuppliesChanged) {
      this.unsubscribe = this.deps.onSuppliesChanged(() => {
        this.loadSupplies().catch(err => {
          console.error('[PolicyEngine] Failed to reload supplies:', err);
        });
      });
    }

    console.log(`[PolicyEngine] Initialized with ${this.supplies.size} supplies`);
  }

  /**
   * Shutdown - cleanup subscriptions
   */
  shutdown(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  /**
   * Load supplies from ONE.core storage
   */
  private async loadSupplies(): Promise<void> {
    const supplyObjects = await this.deps.loadSupplies();

    this.supplies.clear();
    for (const obj of supplyObjects) {
      const supply: PolicySupply = {
        id: obj.id,
        name: obj.name,
        priority: obj.priority,
        plans: obj.plans,
        methods: obj.methods,
        allowedCallerTypes: obj.allowedCallerTypes,
        allowedEntryPoints: obj.allowedEntryPoints,
        allowedTopics: obj.allowedTopics,
        action: obj.action,
        rateLimit: obj.rateLimit
      };
      this.supplies.set(supply.id, supply);
    }

    // Sort by priority descending
    this.sortedSupplies = Array.from(this.supplies.values())
      .sort((a, b) => b.priority - a.priority);

    console.log(`[PolicyEngine] Loaded ${this.supplies.size} supplies`);
  }

  /**
   * Create a new supply (offer access)
   */
  async createSupply(supply: PolicySupply): Promise<void> {
    const supplyObj: PolicySupplyObject = {
      $type$: 'PolicySupply',
      id: supply.id,
      name: supply.name,
      priority: supply.priority,
      plans: supply.plans,
      methods: supply.methods,
      allowedCallerTypes: supply.allowedCallerTypes,
      allowedEntryPoints: supply.allowedEntryPoints,
      allowedTopics: supply.allowedTopics,
      action: supply.action,
      rateLimit: supply.rateLimit,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.deps.storeSupply(supplyObj);
    this.supplies.set(supply.id, supply);
    this.sortedSupplies = Array.from(this.supplies.values())
      .sort((a, b) => b.priority - a.priority);

    console.log(`[PolicyEngine] Created supply: ${supply.id}`);
  }

  /**
   * Remove a supply
   */
  async removeSupply(supplyId: string): Promise<void> {
    await this.deps.deleteSupply(supplyId);
    this.supplies.delete(supplyId);
    this.sortedSupplies = Array.from(this.supplies.values())
      .sort((a, b) => b.priority - a.priority);

    console.log(`[PolicyEngine] Removed supply: ${supplyId}`);
  }

  /**
   * Get all supplies
   */
  getSupplies(): PolicySupply[] {
    return this.sortedSupplies;
  }

  /**
   * Evaluate a demand against supplies
   * Returns a decision and logs the demand
   */
  async evaluate(
    context: RequestContext,
    plan: string,
    method: string,
    params: any
  ): Promise<PolicyDecision> {
    const matchedSupplies: string[] = [];
    let decision: PolicyDecision = {
      allowed: false,
      reason: 'No matching supply',
      matchedRules: []
    };

    // Evaluate supplies in priority order
    for (const supply of this.sortedSupplies) {
      if (this.matchesSupply(context, plan, method, supply)) {
        matchedSupplies.push(supply.id);

        switch (supply.action) {
          case 'allow':
            decision = {
              allowed: true,
              audit: false,
              matchedRules: matchedSupplies
            };
            break;

          case 'allow-with-audit':
            decision = {
              allowed: true,
              audit: true,
              matchedRules: matchedSupplies
            };
            break;

          case 'deny':
            decision = {
              allowed: false,
              reason: `Denied by supply: ${supply.name}`,
              matchedRules: matchedSupplies
            };
            break;

          case 'rate-limit':
            const rateLimitResult = this.checkRateLimit(context, plan, method, supply);
            if (rateLimitResult.limited) {
              decision = {
                allowed: false,
                reason: `Rate limited: retry after ${rateLimitResult.retryAfter}ms`,
                rateLimit: rateLimitResult,
                matchedRules: matchedSupplies
              };
            } else {
              // Rate limit passed, continue to check for allow
              continue;
            }
            break;
        }

        // Log the demand with resolution
        await this.logDemand(context, plan, method, supply.id, decision);
        return decision;
      }
    }

    // No supply matched - log denied demand
    decision.matchedRules = matchedSupplies;
    await this.logDemand(context, plan, method, undefined, decision);
    return decision;
  }

  /**
   * Log a demand (access request) to ONE.core
   */
  private async logDemand(
    context: RequestContext,
    plan: string,
    method: string,
    matchedSupplyId: string | undefined,
    decision: PolicyDecision
  ): Promise<void> {
    const demand: PolicyDemandObject = {
      $type$: 'PolicyDemand',
      id: context.requestId,
      callerId: context.callerId,
      callerType: context.callerType,
      entryPoint: context.entryPoint,
      plan,
      method,
      topicId: context.topicId,
      timestamp: context.timestamp,
      matchedSupplyId,
      decision: decision.allowed ? 'allowed' : 'denied',
      reason: decision.reason
    };

    try {
      await this.deps.storeDemand(demand);
    } catch (err) {
      console.error('[PolicyEngine] Failed to log demand:', err);
    }
  }

  /**
   * Check if context matches a supply
   */
  private matchesSupply(
    context: RequestContext,
    plan: string,
    method: string,
    supply: PolicySupply
  ): boolean {
    // Check caller type
    if (supply.allowedCallerTypes && supply.allowedCallerTypes.length > 0) {
      if (!supply.allowedCallerTypes.includes(context.callerType)) {
        return false;
      }
    }

    // Check entry point
    if (supply.allowedEntryPoints && supply.allowedEntryPoints.length > 0) {
      if (!supply.allowedEntryPoints.includes(context.entryPoint)) {
        return false;
      }
    }

    // Check plan pattern
    if (supply.plans && supply.plans.length > 0) {
      if (!this.matchesPattern(plan, supply.plans)) {
        return false;
      }
    }

    // Check method pattern
    if (supply.methods && supply.methods.length > 0) {
      if (!this.matchesPattern(method, supply.methods)) {
        return false;
      }
    }

    // Check topic
    if (supply.allowedTopics && supply.allowedTopics.length > 0) {
      if (!context.topicId || !supply.allowedTopics.includes(context.topicId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match a value against patterns (supports * wildcard)
   */
  private matchesPattern(value: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === '*') {
        return true;
      }
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        if (value.startsWith(prefix)) {
          return true;
        }
      } else if (pattern.startsWith('*')) {
        const suffix = pattern.slice(1);
        if (value.endsWith(suffix)) {
          return true;
        }
      } else if (pattern === value) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check rate limiting for a request
   */
  private checkRateLimit(
    context: RequestContext,
    plan: string,
    method: string,
    supply: PolicySupply
  ): RateLimitInfo {
    if (!supply.rateLimit) {
      return { limited: false, remaining: Infinity, resetAt: 0 };
    }

    const { maxRequests, windowMs, keyBy } = supply.rateLimit;

    // Build rate limit key
    let key: string;
    switch (keyBy) {
      case 'caller':
        key = `${supply.id}:${context.callerId}`;
        break;
      case 'topic':
        key = `${supply.id}:${context.topicId || 'global'}`;
        break;
      case 'method':
        key = `${supply.id}:${plan}.${method}`;
        break;
      case 'plan':
        key = `${supply.id}:${plan}`;
        break;
      default:
        key = supply.id;
    }

    const now = Date.now();
    let counter = this.rateLimitCounters.get(key);

    // Reset if window expired
    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      this.rateLimitCounters.set(key, counter);
    }

    counter.count++;

    if (counter.count > maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetAt: counter.resetAt,
        retryAfter: counter.resetAt - now
      };
    }

    return {
      limited: false,
      remaining: maxRequests - counter.count,
      resetAt: counter.resetAt
    };
  }
}

export default PolicyEngine;
