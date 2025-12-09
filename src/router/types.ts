/**
 * Router Types
 * Core types for the unified plan router
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';

/**
 * Entry point types for requests
 */
export type EntryPoint = 'ipc' | 'mcp-local' | 'mcp-remote' | 'http' | 'internal';

/**
 * Caller types
 */
export type CallerType = 'user' | 'llm' | 'remote' | 'system';

/**
 * Request context - carries information about the origin and scope of a request
 */
export interface RequestContext {
  // Who is calling
  callerId: string;
  callerType: CallerType;

  // How they're calling
  entryPoint: EntryPoint;

  // What scope
  topicId?: string;
  conversationId?: string;

  // When
  timestamp: number;
  requestId: string;

  // Credentials (for remote MCP)
  credentialId?: string;
}

/**
 * Result from a plan method call
 */
export interface PlanResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Policy decision returned by PolicyEngine
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;

  // Optional modifications
  filteredParams?: any;
  rateLimit?: RateLimitInfo;
  audit?: boolean;

  // Which rules matched
  matchedRules: string[];
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limited: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Policy rule action types
 */
export type PolicyAction = 'allow' | 'deny' | 'allow-with-audit' | 'rate-limit';

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  name: string;
  priority: number;  // Higher = evaluated first

  // Matching conditions
  conditions: PolicyConditions;

  // Action to take
  action: PolicyAction;

  // Rate limit config (if action is rate-limit)
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyBy: 'caller' | 'topic' | 'method' | 'plan';
  };
}

/**
 * Conditions for matching a policy rule
 */
export interface PolicyConditions {
  callerTypes?: CallerType[];
  entryPoints?: EntryPoint[];
  plans?: string[];      // Plan name patterns (supports * wildcard)
  methods?: string[];    // Method name patterns (supports * wildcard)
  topicIds?: string[];   // Specific topics
}

/**
 * Audit entry for logging operations
 */
export interface AuditEntry {
  id: string;
  timestamp: number;

  // Request info
  requestId: string;
  callerId: string;
  callerType: CallerType;
  entryPoint: EntryPoint;

  // Operation
  plan: string;
  method: string;
  params: any;  // May be redacted

  // Context
  topicId?: string;
  credentialId?: string;

  // Result
  decision: 'allowed' | 'denied';
  denyReason?: string;
  executionTimeMs?: number;
  success?: boolean;
  error?: string;

  // Policy
  matchedRules: string[];
}

/**
 * Policy Supply - offered by the Node.js owner
 * Defines what access is available and under what conditions
 */
export interface PolicySupplyObject {
  $type$: 'PolicySupply';
  id: string;
  name: string;
  priority: number;

  // What is being supplied
  plans?: string[];       // Plan patterns allowed
  methods?: string[];     // Method patterns allowed

  // Who can demand it
  allowedCallerTypes?: CallerType[];
  allowedEntryPoints?: EntryPoint[];
  allowedTopics?: string[];

  // Constraints
  action: PolicyAction;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyBy: 'caller' | 'topic' | 'method' | 'plan';
  };

  createdAt: number;
  updatedAt: number;
}

/**
 * Policy Demand - request for access
 * Created when a caller requests to execute a plan method
 */
export interface PolicyDemandObject {
  $type$: 'PolicyDemand';
  id: string;

  // Who is demanding
  callerId: string;
  callerType: CallerType;
  entryPoint: EntryPoint;

  // What is being demanded
  plan: string;
  method: string;
  topicId?: string;

  // When
  timestamp: number;

  // Resolution
  matchedSupplyId?: string;
  decision: 'allowed' | 'denied';
  reason?: string;
}

/**
 * Policy rule as stored in ONE.core
 */
export interface PolicyRuleObject {
  $type$: 'PolicyRule';
  id: string;
  name: string;
  priority: number;
  conditions: PolicyConditions;
  action: PolicyAction;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyBy: 'caller' | 'topic' | 'method' | 'plan';
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Audit entry as stored in ONE.core
 */
export interface AuditEntryObject {
  $type$: 'AuditEntry';
  id: string;
  timestamp: number;
  requestId: string;
  callerId: string;
  callerType: CallerType;
  entryPoint: EntryPoint;
  plan: string;
  method: string;
  params: string;  // JSON stringified
  topicId?: string;
  credentialId?: string;
  decision: 'allowed' | 'denied';
  denyReason?: string;
  executionTimeMs?: number;
  success?: boolean;
  error?: string;
  matchedRules: string;  // JSON stringified array
}
