/**
 * Default Policy Supplies
 * Initial supplies for system access
 *
 * Supplies define what access is available.
 * Higher priority supplies are evaluated first.
 */

import type { PolicySupply } from './PolicyEngine.js';

/**
 * Default policy supplies
 * Priority: Higher number = evaluated first
 */
export const defaultPolicySupplies: PolicySupply[] = [
  // System calls - full access (highest priority)
  {
    id: 'supply:system:all',
    name: 'System full access',
    priority: 1000,
    allowedCallerTypes: ['system'],
    action: 'allow'
  },

  // Internal calls - full access
  {
    id: 'supply:internal:all',
    name: 'Internal full access',
    priority: 990,
    allowedEntryPoints: ['internal'],
    action: 'allow'
  },

  // Local user via IPC - full access
  {
    id: 'supply:ipc:user',
    name: 'Local user IPC access',
    priority: 900,
    allowedCallerTypes: ['user'],
    allowedEntryPoints: ['ipc'],
    action: 'allow'
  },

  // Local LLM via MCP - full access with audit
  {
    id: 'supply:mcp-local:llm',
    name: 'Local LLM MCP access',
    priority: 800,
    allowedCallerTypes: ['llm'],
    allowedEntryPoints: ['mcp-local'],
    action: 'allow-with-audit'
  },

  // Remote MCP - requires credential (checked by adapter)
  // This supply allows remote access but the adapter validates credentials first
  {
    id: 'supply:mcp-remote:credentialed',
    name: 'Remote MCP with credential',
    priority: 700,
    allowedEntryPoints: ['mcp-remote'],
    action: 'allow-with-audit'
  },

  // Rate limit for remote calls
  {
    id: 'supply:mcp-remote:rate-limit',
    name: 'Remote rate limiting',
    priority: 650,
    allowedEntryPoints: ['mcp-remote'],
    action: 'rate-limit',
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000,
      keyBy: 'caller'
    }
  },

  // Sensitive operations audit - delete methods
  {
    id: 'supply:audit:delete',
    name: 'Audit delete operations',
    priority: 500,
    methods: ['delete*'],
    action: 'allow-with-audit'
  },

  // Sensitive operations audit - remove methods
  {
    id: 'supply:audit:remove',
    name: 'Audit remove operations',
    priority: 500,
    methods: ['remove*'],
    action: 'allow-with-audit'
  },

  // Sensitive operations audit - revoke methods
  {
    id: 'supply:audit:revoke',
    name: 'Audit revoke operations',
    priority: 500,
    methods: ['revoke*'],
    action: 'allow-with-audit'
  },

  // HTTP API - with audit
  {
    id: 'supply:http:all',
    name: 'HTTP API access',
    priority: 400,
    allowedEntryPoints: ['http'],
    action: 'allow-with-audit'
  }

  // Note: No default deny supply
  // If no supply matches, the engine returns denied by default
];

export default defaultPolicySupplies;
