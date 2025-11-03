# mcp.core

Platform-agnostic Model Context Protocol (MCP) integration for LAMA.

## Features

- **MCPManager**: MCP server lifecycle management
- **MCPLamaServer**: LAMA-specific MCP server implementation
- **Tool Interface**: Platform-agnostic tool definitions and execution
- **Memory Tools**: LLM access to conversation history
- **Cube Tools**: LLM access to LAMA operations (chat, contacts, etc.)

## Architecture

```
mcp.core/
├── server/             # MCP server implementations
├── tools/              # Concrete tool implementations
├── interface/          # Tool definitions and execution engine
├── recipes/            # ONE.core recipe definitions
└── types/              # TypeScript type definitions
```

## Usage

### In lama.electron (Node.js)

```typescript
import { MCPManager, MemoryTools, CubeTools } from '@mcp.core';

const mcpManager = new MCPManager({
  tools: [
    new MemoryTools(nodeOneCore),
    new CubeTools(nodeOneCore)
  ]
});

await mcpManager.start();
```

### Tool Interface (Platform-Agnostic)

```typescript
import { createMCPToolInterface } from '@mcp.core';

const toolInterface = createMCPToolInterface({
  nodeOneCore,
  aiAssistantModel
});

// Execute a tool
const result = await toolInterface.executeTool('memory:search', {
  query: 'pizza',
  limit: 10
});

// Get tool definitions for MCP
const mcpFormat = toolInterface.toMCPFormat();
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@refinio/one.core` - Storage and versioning

## NO Platform Dependencies

This package is platform-agnostic and has NO dependencies on:
- Node.js APIs (except for MCPManager which runs in Node.js)
- Electron APIs
- Browser APIs

Tool definitions and execution logic are platform-agnostic.
