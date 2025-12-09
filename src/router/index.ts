/**
 * Router module exports
 */

export * from './types.js';
export { PlanRouter, PolicyDeniedError } from './PlanRouter.js';
export type { PlanRouterDependencies } from './PlanRouter.js';

// Adapters
export { IPCAdapter } from './adapters/IPCAdapter.js';
export type { IPCAdapterDependencies } from './adapters/IPCAdapter.js';

export { MCPLocalAdapter } from './adapters/MCPLocalAdapter.js';
export type { MCPLocalAdapterDependencies, MCPToolResult } from './adapters/MCPLocalAdapter.js';

export { MCPRemoteAdapter } from './adapters/MCPRemoteAdapter.js';
export type {
  MCPRemoteAdapterDependencies,
  MCPRequest,
  MCPResponse,
  MCPToolResultObject
} from './adapters/MCPRemoteAdapter.js';
