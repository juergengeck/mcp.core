/**
 * MCPLocalServer
 * Local MCP server for Node.js - provides access to LAMA features via MCP protocol
 *
 * This server uses MCPLocalAdapter for tool routing through PlanRouter,
 * which provides policy enforcement and audit logging.
 *
 * This runs in the Node.js main process where it has access to:
 * - ONE.core instance
 * - PlanRouter with registered plans
 * - PolicyEngine for access control
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MCPToolInterface } from '../interface/mcp-tool-interface.js';
import type { MCPLocalAdapter } from '../router/adapters/MCPLocalAdapter.js';

export interface MCPLocalServerDependencies {
  adapter: MCPLocalAdapter;
  getCallerId?: () => string;
}

export class MCPLocalServer {
  public server: any;
  private adapter: MCPLocalAdapter;
  private toolInterface: MCPToolInterface;
  private getCallerId: () => string;

  constructor(deps: MCPLocalServerDependencies) {
    this.adapter = deps.adapter;
    this.getCallerId = deps.getCallerId || (() => 'mcp-local-client');

    this.server = new Server({
      name: 'lama-app',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    // Tool interface for schema/discovery only
    this.toolInterface = new MCPToolInterface();
  }

  /**
   * Set up MCP request handlers
   */
  setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.adapter.getAvailableTools()
    }));

    // Handle tool calls via adapter
    this.server.setRequestHandler(CallToolRequestSchema, this.adapter.createMCPRequestHandler());
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    // Set up request handlers BEFORE connecting
    this.setupTools();

    // Now connect the transport
    await this.server.connect(transport);

    console.error('[MCPLocalServer] ✅ LAMA MCP Server started');
  }

  /**
   * Get tool definitions for schema discovery
   */
  getToolDefinitions() {
    return this.toolInterface.toMCPFormat();
  }

  /**
   * Get tool description text for LLM prompts
   */
  getToolDescriptionText(): string {
    return this.toolInterface.getToolDescriptionText();
  }
}

export default MCPLocalServer;
