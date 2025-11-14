# LAMA MCP Server

Standalone MCP (Model Context Protocol) server that exposes LAMA functionality to Claude Desktop and other MCP clients.

## Architecture

```
┌─────────────────┐
│ Claude Desktop  │
│   (MCP Client)  │
└────────┬────────┘
         │ stdio
         │
         ▼
┌─────────────────────────────────┐
│  lama-mcp-server.js             │
│  (This Process)                 │
│  • NO ONE.core                  │
│  • HTTP Client Proxy            │
│  • MCPLamaServer                │
└────────┬────────────────────────┘
         │ HTTP/REST
         │
         ▼
┌─────────────────────────────────┐
│  refinio.api Server             │
│  (Main LAMA Process)            │
│  • ONE.core                     │
│  • All Plans & Handlers         │
│  • REST API Endpoints           │
└─────────────────────────────────┘
```

## Quick Start

### 1. Ensure refinio.api Server is Running

The MCP server requires a running LAMA API server:

```bash
# Start the main LAMA server (default: http://localhost:49498)
cd /path/to/refinio.api
npm start
```

### 2. Test the MCP Server

```bash
# From mcp.core directory
cd /path/to/mcp.core

# Test help
node bin/lama-mcp-server.js --help

# Test connection (will fail if API server not running)
node bin/lama-mcp-server.js
# Press Ctrl+C to exit
```

### 3. Configure Claude Desktop

Add to `~/.config/claude/mcp.json` (create if doesn't exist):

```json
{
  "mcpServers": {
    "lama": {
      "command": "node",
      "args": ["/absolute/path/to/mcp.core/bin/lama-mcp-server.js"],
      "env": {
        "LAMA_API_URL": "http://localhost:49498"
      }
    }
  }
}
```

**Important**: Use absolute paths, not relative paths!

### 4. Restart Claude Desktop

Close and restart Claude Desktop to load the new MCP server configuration.

## Configuration

### Command Line Options

```bash
node lama-mcp-server.js [options]

Options:
  --url <url>     LAMA API base URL (default: http://localhost:49498)
  --help, -h      Show this help message
```

### Environment Variables

- `LAMA_API_URL` - Override default API URL

### Examples

```bash
# Connect to default local server
node lama-mcp-server.js

# Connect to custom server
node lama-mcp-server.js --url http://localhost:3000

# Use environment variable
LAMA_API_URL=http://192.168.1.100:49498 node lama-mcp-server.js
```

## Available Tools

The MCP server exposes these LAMA tools to Claude Desktop:

### Chat Tools
- `send_message` - Send a message in a chat topic
- `get_messages` - Get messages from a chat topic
- `list_topics` - List all available chat topics

### Contact Tools
- `get_contacts` - Get list of contacts
- `search_contacts` - Search for contacts by name or ID

### Connection Tools
- `list_connections` - List all network connections
- `create_invitation` - Create a pairing invitation

### Chat Memory Tools
- `enable_chat_memories` - Enable automatic memory extraction
- `disable_chat_memories` - Disable memory extraction
- `toggle_chat_memories` - Toggle memory extraction on/off
- `extract_chat_subjects` - Manually extract subjects from history
- `find_chat_memories` - Find related memories by keywords
- `get_chat_memory_status` - Get memory extraction status

### LLM Tools (Future)
- `list_models` - List available AI models
- `load_model` - Load an AI model

### AI Assistant Tools (Future)
- `create_ai_topic` - Create a new AI-enabled chat topic
- `generate_ai_response` - Generate an AI response

## Troubleshooting

### "Failed to connect to LAMA API"

**Cause**: refinio.api server is not running or not accessible

**Solution**:
1. Start the refinio.api server: `npm start`
2. Verify it's running: `curl http://localhost:49498/health`
3. Check the URL in your MCP config matches the server

### "Cannot find module"

**Cause**: Using relative path in Claude Desktop config

**Solution**: Use absolute paths in `~/.config/claude/mcp.json`:
```json
"args": ["/Users/you/src/lama/mcp.core/bin/lama-mcp-server.js"]
```

### Claude Desktop doesn't show LAMA tools

**Solutions**:
1. Check Claude Desktop console/logs for errors
2. Restart Claude Desktop completely
3. Verify MCP config syntax is valid JSON
4. Test the server manually: `node bin/lama-mcp-server.js --help`

### "HTTP 404" or "HTTP 500" errors

**Cause**: refinio.api server doesn't have the required endpoints

**Solution**:
1. Ensure refinio.api is up to date
2. Check that the Handler Registry is properly initialized
3. Verify the REST transport is configured

## Development

### Building from Source

```bash
# Build TypeScript
npm run build

# The bin/lama-mcp-server.js file is pre-compiled and ready to use
# The TypeScript source is in bin/lama-mcp-server.ts
```

### Testing Locally

```bash
# Terminal 1: Start LAMA API server
cd /path/to/refinio.api
npm start

# Terminal 2: Start MCP server (stdin/stdout test)
cd /path/to/mcp.core
node bin/lama-mcp-server.js

# Terminal 3: Test with MCP inspector (optional)
npx @modelcontextprotocol/inspector node /path/to/mcp.core/bin/lama-mcp-server.js
```

### Adding New Tools

1. Add the tool to refinio.api Handler Registry
2. The tool will automatically be available via HTTP API
3. Add the tool definition to `mcp.core/src/server/MCPLamaServer.ts`
4. Add the HTTP client method to `bin/lama-mcp-server.ts` `LamaHttpClient` class
5. Rebuild: `npm run build`

## Architecture Details

### Why HTTP Proxy?

The MCP server runs as a separate process from the main LAMA application. This design:
- ✅ Keeps ONE.core in a single process (avoids multi-instance conflicts)
- ✅ Allows MCP server to be lightweight and stateless
- ✅ Enables easy deployment and scaling
- ✅ Works with any LAMA server (cube, browser, worker)
- ✅ No platform-specific dependencies in MCP server

### Communication Flow

1. Claude Desktop calls MCP tool via stdio
2. `lama-mcp-server.js` receives MCP protocol request
3. HTTP client converts to REST API call
4. `refinio.api` server processes request via Handler Registry
5. ONE.core and Plans execute business logic
6. Response flows back through HTTP → MCP → Claude Desktop

### Security Considerations

⚠️ **Current State**: NO ACCESS CONTROL
- External MCP clients have FULL ACCESS to all LAMA data
- Only use on trusted local machines
- Do not expose refinio.api to untrusted networks

🔒 **Future**: Implement access control
- MCPClientAccess verification (per-chat, per-assembly grants)
- Client authentication with cryptographic verification
- MCPClientAudit logging for all operations
- UI for managing client access grants

## See Also

- [refinio.api Handler Registry](../packages/refinio.api/README-HANDLER-REGISTRY.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
