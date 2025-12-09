/**
 * MCP Module for lama.core
 *
 * Platform-agnostic Model Context Protocol integration components
 *
 * For tool execution, use the adapters from @mcp/core/router:
 * - MCPLocalAdapter: For local MCP server (stdio)
 * - MCPRemoteAdapter: For remote MCP over chat
 * - IPCAdapter: For Electron IPC
 */

// Types
export type {
  MCPToolDefinition,
  MCPToolParameter,
  MCPToolResult,
  MCPToolContext,
  MCPToolExecutor as IMCPToolExecutor,
  MCPToolDependencies,
  MCPToolCategory,
  MCPToolRegistration
} from './types.js';

// Tool Definitions (schema only, execution via adapters)
export {
  chatTools,
  contactTools,
  connectionTools,
  llmTools,
  aiAssistantTools,
  allTools,
  getToolsByCategory,
  getToolDefinition,
  getAllToolNames
} from './tool-definitions.js';
export type { ToolDefinitionWithCategory } from './tool-definitions.js';

// Tool Interface (for tool discovery/schema)
export { MCPToolInterface, createMCPToolInterface } from './mcp-tool-interface.js';
