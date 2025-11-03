/**
 * mcp.core - Platform-agnostic Model Context Protocol integration
 *
 * Provides MCP server, tools, and interfaces for exposing
 * LAMA functionality to LLMs.
 */

// Server
export * from './server/MCPManager.js';
export { default as mcpManager } from './server/MCPManager.js';
export * from './server/MCPLamaServer.js';

// Tools
export * from './tools/index.js';

// Interface (tool definitions and execution)
export * from './interface/index.js';

// Recipes
export * from './recipes/mcp-recipes.js';
