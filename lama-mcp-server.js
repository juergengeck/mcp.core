#!/usr/bin/env node
/**
 * LAMA MCP Server (Standalone)
 *
 * Runs as a standalone MCP server that connects to LAMA via HTTP API.
 * Designed for use with Claude Desktop and other MCP clients.
 *
 * Architecture:
 * - NO ONE.core in this process
 * - Connects to refinio.api HTTP server (default: http://localhost:49498)
 * - Uses MCPLamaServer with HTTP client proxy
 * - All operations routed through REST API
 *
 * Usage:
 *   node dist/bin/lama-mcp-server.js
 *   node dist/bin/lama-mcp-server.js --url http://localhost:3000
 *
 * MCP Config (~/.config/claude/mcp.json):
 * {
 *   "mcpServers": {
 *     "lama": {
 *       "command": "node",
 *       "args": ["/path/to/mcp.core/dist/bin/lama-mcp-server.js"]
 *     }
 *   }
 * }
 */
import { LamaMCPServer } from '../dist/server/MCPLamaServer.js';
/**
 * HTTP Proxy Client
 *
 * Mimics nodeOneCore interface but routes calls through REST API
 */
class LamaHttpClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    // Chat operations
    async sendMessage(params) {
        return this.post('/api/chat/sendMessage', params);
    }
    async getMessages(params) {
        return this.post('/api/chat/getMessages', params);
    }
    async listTopics() {
        return this.post('/api/chat/listTopics', {});
    }
    // Contact operations
    async getContacts() {
        return this.post('/api/contacts/getContacts', {});
    }
    // Connection operations
    connectionsModel = {
        connectionsInfo: async () => {
            return this.post('/api/connections/list', {});
        },
        pairing: {
            createInvitation: async () => {
                return this.post('/api/connections/createInvitation', {});
            }
        }
    };
    // Chat Memory operations
    chatMemoryHandler = {
        enableMemories: async (topicId, autoExtract = true, keywords = []) => {
            return this.post('/api/chatMemory/enableMemories', { topicId, autoExtract, keywords });
        },
        disableMemories: async (topicId) => {
            return this.post('/api/chatMemory/disableMemories', { topicId });
        },
        toggleMemories: async (topicId) => {
            return this.post('/api/chatMemory/toggleMemories', { topicId });
        },
        extractSubjects: async (params) => {
            return this.post('/api/chatMemory/extractSubjects', params);
        },
        findRelatedMemories: async (topicId, keywords, limit = 10) => {
            return this.post('/api/chatMemory/findRelatedMemories', { topicId, keywords, limit });
        },
        getMemoryStatus: (topicId) => {
            // Synchronous method - not supported via HTTP, return empty status
            return { enabled: false, config: null };
        }
    };
    // HTTP helper
    async post(endpoint, body) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`HTTP ${response.status}: ${error}`);
            }
            const result = await response.json();
            // Unwrap REST response format
            if (result.success !== undefined && result.body !== undefined) {
                return result.body;
            }
            return result;
        }
        catch (error) {
            console.error(`[LamaHttpClient] Error calling ${endpoint}:`, error);
            throw error;
        }
    }
}
/**
 * AI Assistant Mock
 *
 * LLM operations through HTTP API
 */
class AIAssistantHttpProxy {
    client;
    constructor(client) {
        this.client = client;
    }
    getAvailableLLMModels() {
        // TODO: Implement via HTTP API
        return [];
    }
    llmManager = {
        loadModel: async (modelId) => {
            // TODO: Implement via HTTP API
            throw new Error('LLM operations not yet supported via HTTP API');
        }
    };
    async getOrCreateAITopic(modelId) {
        // TODO: Implement via HTTP API
        throw new Error('AI topic creation not yet supported via HTTP API');
    }
    async generateResponse(params) {
        // TODO: Implement via HTTP API
        throw new Error('AI response generation not yet supported via HTTP API');
    }
}
/**
 * Parse CLI arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    let url = process.env.LAMA_API_URL || 'http://localhost:49498';
    let help = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--url' && i + 1 < args.length) {
            url = args[i + 1];
            i++;
        }
        else if (args[i] === '--help' || args[i] === '-h') {
            help = true;
        }
    }
    return { url, help };
}
/**
 * Show usage
 */
function showHelp() {
    console.error(`
LAMA MCP Server

Usage:
  node lama-mcp-server.js [options]

Options:
  --url <url>     LAMA API base URL (default: http://localhost:49498)
  --help, -h      Show this help message

Environment:
  LAMA_API_URL    Override default API URL

Examples:
  # Connect to default local server
  node lama-mcp-server.js

  # Connect to custom server
  node lama-mcp-server.js --url http://localhost:3000

  # Use environment variable
  LAMA_API_URL=http://192.168.1.100:49498 node lama-mcp-server.js

Claude Desktop Config (~/.config/claude/mcp.json):
{
  "mcpServers": {
    "lama": {
      "command": "node",
      "args": ["/path/to/mcp.core/dist/bin/lama-mcp-server.js"],
      "env": {
        "LAMA_API_URL": "http://localhost:49498"
      }
    }
  }
}
`);
}
/**
 * Main entry point
 */
async function main() {
    const { url, help } = parseArgs();
    if (help) {
        showHelp();
        process.exit(0);
    }
    console.error('[LAMA MCP] Starting LAMA MCP Server...');
    console.error(`[LAMA MCP] Connecting to: ${url}`);
    // Create HTTP client
    const httpClient = new LamaHttpClient(url);
    // Test connection
    try {
        console.error('[LAMA MCP] Testing connection...');
        await httpClient.listTopics();
        console.error('[LAMA MCP] ✅ Connected to LAMA API');
    }
    catch (error) {
        console.error('[LAMA MCP] ❌ Failed to connect to LAMA API');
        console.error('[LAMA MCP] Error:', error.message);
        console.error('[LAMA MCP] Make sure the LAMA API server is running at:', url);
        process.exit(1);
    }
    // Create AI assistant proxy
    const aiAssistant = new AIAssistantHttpProxy(httpClient);
    // Create MCP server
    const mcpServer = new LamaMCPServer(httpClient, aiAssistant);
    // Start server
    await mcpServer.start();
    console.error('[LAMA MCP] ✅ LAMA MCP Server is ready');
    console.error('[LAMA MCP] Listening for MCP requests on stdio...');
}
// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('[LAMA MCP] Unhandled rejection:', error);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('[LAMA MCP] Uncaught exception:', error);
    process.exit(1);
});
// Handle graceful shutdown
process.on('SIGINT', () => {
    console.error('[LAMA MCP] Received SIGINT, shutting down...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.error('[LAMA MCP] Received SIGTERM, shutting down...');
    process.exit(0);
});
// Run
main().catch((error) => {
    console.error('[LAMA MCP] Fatal error:', error);
    process.exit(1);
});
