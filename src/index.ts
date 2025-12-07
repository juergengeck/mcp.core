/**
 * mcp.core - Model Context Protocol integration for LAMA
 *
 * Submodules:
 * - @mcp/core/local - Node.js only, local MCP execution
 * - @mcp/core/remote - All platforms, remote MCP via chat
 *
 * Common exports available from main entry point.
 */

// Common exports (platform-agnostic)
export * from './interface/index.js';
export * from './tools/index.js';
export * from './recipes/mcp-recipes.js';
export * from './types/mcp-types.js';

// Re-export remote types (platform-agnostic)
export * from './remote/types.js';

// Note: local/ exports require Node.js - import directly:
// import { MCPManager, MCPLocalServer } from '@mcp/core/local';
