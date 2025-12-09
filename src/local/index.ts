/**
 * mcp.core/local - Node.js-only MCP execution
 *
 * This module requires Node.js and cannot be used in browser/mobile.
 * It provides local MCP server management.
 *
 * For tool execution, use the adapters from @mcp/core/router:
 * - MCPLocalAdapter: For local MCP server (stdio)
 * - MCPRemoteAdapter: For remote MCP over chat
 */

export * from './MCPManager.js';
export { default as mcpManager } from './MCPManager.js';

export * from './MCPLocalServer.js';
export { default as MCPLocalServer } from './MCPLocalServer.js';

export * from './MCPSupplyManager.js';
export { default as MCPSupplyManager } from './MCPSupplyManager.js';
