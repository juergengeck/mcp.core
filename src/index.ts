/**
 * mcp.core - Model Context Protocol integration for LAMA
 *
 * Submodules:
 * - @mcp/core/local - Node.js only, local MCP execution
 * - @mcp/core/remote - All platforms, remote MCP via chat
 * - @mcp/core/router - Unified plan router with policy engine
 * - @mcp/core/policy - Policy engine with Supply/Demand pattern
 * - @mcp/core/audit - Audit logging
 *
 * Common exports available from main entry point.
 */

// Common exports (platform-agnostic)
export * from './interface/index.js';
export * from './tools/index.js';
export * from './recipes/index.js';
// Note: types/mcp-types.js exports are already covered by interface/index.js

// Re-export remote types (platform-agnostic)
export * from './remote/types.js';

// Note: local/ exports require Node.js - import directly:
// import { MCPManager, MCPLocalServer } from '@mcp/core/local';

// Note: router/, policy/, audit/ exports - import directly:
// import { PlanRouter, IPCAdapter } from '@mcp/core/router';
// import { PolicyEngine } from '@mcp/core/policy';
// import { AuditLogger } from '@mcp/core/audit';
