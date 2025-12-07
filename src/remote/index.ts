/**
 * mcp.core/remote - Platform-agnostic MCP client
 *
 * This module works on all platforms (Node.js, browser, mobile).
 * It sends MCP requests via chat to Node.js peers.
 */

export * from './types.js';
export * from './MCPCredentialCache.js';
export { default as MCPCredentialCache } from './MCPCredentialCache.js';
export * from './MCPDemandManager.js';
export { default as MCPDemandManager } from './MCPDemandManager.js';
export * from './MCPRemoteClient.js';
export { default as MCPRemoteClient } from './MCPRemoteClient.js';
