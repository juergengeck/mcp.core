# mcp.core

Platform-agnostic Model Context Protocol (MCP) integration for LAMA.

## Overview

`mcp.core` provides bidirectional MCP integration:

- **Inbound MCP**: AI assistants in LAMA can use external MCP tools (filesystem, etc.)
- **Outbound MCP**: External AI assistants (Claude Desktop) can access LAMA functionality

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   mcp.core                          │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  MCPManager (Inbound)                      │   │
│  │  • Connects to external MCP servers        │   │
│  │  • Tool discovery and execution            │   │
│  │  • Tool call auditability                  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  MCPLamaServer (Outbound)                  │   │
│  │  • Plan Registry pattern                   │   │
│  │  • Dynamic tool discovery                  │   │
│  │  • Meta-tools (discover_plans, call_plan)  │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Core Tools                                │   │
│  │  • MemoryTools - LLM memory storage        │   │
│  │  • AssemblyTools - Supply/Demand/Plans     │   │
│  │  • PlanRegistry - Dynamic plan discovery   │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
mcp.core/
├── src/
│   ├── server/              # MCP server implementations
│   │   ├── MCPManager.ts    # Inbound: external tool management
│   │   └── MCPLamaServer.ts # Outbound: LAMA tool exposure
│   ├── tools/               # Tool implementations
│   │   ├── MemoryTools.js   # Memory storage and retrieval
│   │   ├── AssemblyTools.js # Supply/Demand/Assembly/Plan ops
│   │   ├── PlanRegistry.ts  # Dynamic plan registration
│   │   └── PlanMetaTools.ts # Plan discovery meta-tools
│   ├── interface/           # Tool definitions & execution
│   │   ├── tool-definitions.ts  # MCP tool schemas
│   │   ├── tool-executor.ts     # Tool execution engine
│   │   └── mcp-tool-interface.ts # Platform abstraction
│   ├── recipes/             # ONE.core data models
│   │   └── mcp-recipes.ts   # MCP storage schemas
│   └── types/               # TypeScript definitions
├── README.md                # This file
└── MCP-SERVER.md           # Standalone server docs (legacy)
```

## Key Concepts

### 1. Plan Registry Pattern

Instead of hard-coding tool definitions, `mcp.core` uses a **Plan Registry** where:

- Platform implementations (lama.cube, lama.browser) register plan instances
- Plans are platform-agnostic business logic (ChatPlan, ContactsPlan, etc.)
- MCP tools discover and call plan methods dynamically
- No static tool list - everything is discovered at runtime

**Example:**

```typescript
import { planRegistry } from '@mcp/core';

// Register a plan instance
planRegistry.registerPlan(
  'chat',           // Plan name
  'messaging',      // Category
  chatPlanInstance, // Plan instance with methods
  'Chat and messaging operations'
);

// MCP clients can now discover and call chat plan methods
```

### 2. Bidirectional MCP

**Inbound (External tools → LAMA AI):**
```typescript
import { mcpManager } from '@mcp/core';

// MCPManager connects to external MCP servers
await mcpManager.init();

// AI assistants can now use tools like:
// - filesystem:read_file
// - filesystem:write_file
// - memory:store
// - assembly:createSupply
```

**Outbound (External AI → LAMA):**
```typescript
import { LamaMCPServer } from '@mcp/core';

// Expose LAMA functionality via MCP
const mcpServer = new LamaMCPServer(nodeOneCore);
await mcpServer.start();

// External clients (Claude Desktop) can now use:
// - discover_plans (see what LAMA can do)
// - call_plan (execute LAMA operations)
// - memory_* (access LAMA memories)
```

### 3. Meta-Tools

External MCP clients discover functionality via meta-tools:

- `discover_plans` - List all available plans and methods
- `call_plan` - Execute a specific plan method
- No hard-coded tool list required

**Flow:**
1. Client calls `discover_plans` → sees "chat" plan with "sendMessage" method
2. Client calls `call_plan` with `{plan: "chat", method: "sendMessage", params: {...}}`
3. Plan registry routes to ChatPlan.sendMessage()

## Usage

### Inbound MCP (AI uses external tools)

Used in lama.cube to give AI assistants access to filesystem, memory, etc.

```typescript
import { mcpManager } from '@mcp/core';

// Initialize in Node.js main process
mcpManager.setNodeOneCore(nodeOneCore);
await mcpManager.init();

// Get available tools
const tools = mcpManager.getAvailableTools();
// Returns: filesystem:read_file, memory:store, assembly:createSupply, etc.

// Execute a tool
const result = await mcpManager.executeTool(
  'filesystem:read_file',
  { path: '/path/to/file.txt' }
);

// Store tool call for audit
await mcpManager.storeToolCall({
  id: 'tool-call-123',
  toolName: 'filesystem:read_file',
  parameters: { path: '/path/to/file.txt' },
  result,
  timestamp: Date.now(),
  topicId: 'conversation-id'
});
```

### Outbound MCP (External AI accesses LAMA)

Used in standalone MCP server to expose LAMA to Claude Desktop.

```typescript
import { LamaMCPServer } from '@mcp/core';
import { planRegistry, registerLamaCorePlans } from '@mcp/core';

// Register plans with the registry
const deps = { nodeOneCore, aiAssistantModel };
registerLamaCorePlans(deps);

// Register platform-specific plans
const chatPlan = new ChatPlan(nodeOneCore);
planRegistry.registerPlan('chat', 'messaging', chatPlan);

// Start MCP server (listens on stdio)
const mcpServer = new LamaMCPServer(nodeOneCore);
await mcpServer.start();

// External clients can now:
// - discover_plans → see chat, contacts, ai, etc.
// - call_plan → execute LAMA operations
```

### Tool Interface (Platform-Agnostic)

For platform-agnostic tool definitions and execution:

```typescript
import { MCPToolInterface } from '@mcp/core';

const toolInterface = new MCPToolInterface(mcpServer, nodeOneCore);

// Get tool definitions in MCP format
const tools = toolInterface.getToolDefinitions();

// Execute a tool
const result = await toolInterface.executeTool('memory:store', {
  content: 'User prefers dark mode',
  category: 'preferences'
});
```

## Data Models (ONE.core)

All MCP data stored as versioned ONE.core objects:

### MCPServer
```typescript
{
  $type$: 'MCPServer',
  name: string,        // Server ID
  command: string,     // Executable
  args: string[],
  description: string,
  enabled: boolean,
  createdAt: number,
  updatedAt: number
}
```

### MCPServerConfig
```typescript
{
  $type$: 'MCPServerConfig',
  userEmail: string,   // User ID
  servers: SHA256IdHash<MCPServer>[],
  updatedAt: number
}
```

### MCPTopicConfig
```typescript
{
  $type$: 'MCPTopicConfig',
  topicId: string,     // Conversation ID
  inboundEnabled: boolean,   // AI can use tools
  outboundEnabled: boolean,  // External access
  allowedTools?: string[],
  createdAt: number,
  updatedAt: number
}
```

### MCPToolCall
```typescript
{
  $type$: 'MCPToolCall',
  id: string,
  toolName: string,
  parameters: string,  // JSON
  result?: string,     // JSON
  error?: string,
  timestamp: number,
  duration?: number,
  topicId: string,
  messageHash?: string
}
```

## Available Tools

### Inbound Tools (External → LAMA AI)

**Filesystem** (28 tools from 2 servers):
- `filesystem:read_file`, `filesystem:write_file`, `filesystem:edit_file`
- `filesystem:list_directory`, `filesystem:directory_tree`
- `filesystem:create_directory`, `filesystem:move_file`
- `filesystem-home:*` (same tools, different root)

**Memory** (3 tools):
- `memory:store` - Store information for later retrieval
- `memory:recall` - Retrieve stored memories
- `memory:search` - Search memories by keyword

**Assembly** (9 tools):
- `assembly:createSupply` - Create a Supply object
- `assembly:createDemand` - Create a Demand object
- `assembly:createAssembly` - Match Supply and Demand
- `assembly:createPlan` - Create execution Plan
- `assembly:createStory` - Create user Story
- `assembly:queryAssemblies`, `assembly:queryPlans`
- `assembly:getAssembly`, `assembly:getPlan`

### Outbound Tools (LAMA → External AI)

**Meta-Tools**:
- `discover_plans` - List all available plans and methods
- `call_plan` - Execute a plan method

**Memory Tools**:
- `memory_store`, `memory_recall`, `memory_search`
- `subject_extract`, `subject_search`, `subject_list`

**Plans** (discovered dynamically via `discover_plans`):
- `chat` - Send/receive messages, list conversations
- `contacts` - Get/search contacts
- `ai` - AI model management and generation
- `assembly` - Supply/Demand/Assembly/Plan operations
- And more...

## Integration Examples

### lama.cube (Electron)

```typescript
// main/core/node-one-core.ts
import { mcpManager } from '@mcp/core';

// Initialize MCP manager after ONE.core is ready
mcpManager.setNodeOneCore(nodeOneCore);
await mcpManager.init();

// Register plans for outbound MCP
import { planRegistry } from '@mcp/core';
import { ChatPlan } from '@chat/core/plans/ChatPlan';

const chatPlan = new ChatPlan(nodeOneCore);
planRegistry.registerPlan('chat', 'messaging', chatPlan);
```

### lama.browser

```typescript
// Browser can't run Node.js MCP servers
// But can use HTTP proxy to access LAMA MCP functionality
// (Future implementation)
```

### Standalone MCP Server

See `MCP-SERVER.md` for standalone server setup connecting to LAMA API.

## Security Considerations

### Inbound MCP (AI uses tools)
- Per-conversation control (MCPTopicConfig)
- Tool calls audited (MCPToolCall storage)
- Tools only execute when explicitly enabled

### Outbound MCP (External AI accesses LAMA)
⚠️ **NO ACCESS CONTROL IMPLEMENTED**

Current state:
- External MCP clients have FULL ACCESS to all LAMA data
- No per-chat or per-assembly access grants
- No client authentication
- Only use with trusted clients on personal machines

Required for production:
- MCPClientAccess verification (per-chat, per-assembly grants)
- Client authentication with cryptographic verification
- MCPClientAudit logging for all operations
- UI for managing client access grants
- Access revocation support

See lama.cube MCP.md for access control data model and implementation plan.

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `@refinio/one.core` - Storage and versioning

## Platform Requirements

- **MCPManager**: Requires Node.js (uses child processes via stdio)
- **MCPLamaServer**: Requires Node.js (uses stdio transport)
- **Tools & Interface**: Platform-agnostic (can run anywhere)

## Related Documentation

- [lama.cube MCP.md](../lama.cube/MCP.md) - Detailed MCP integration docs
- [lama.cube MCP-QUICKSTART.md](../lama.cube/MCP-QUICKSTART.md) - Quick setup guide
- [MCP-SERVER.md](./MCP-SERVER.md) - Standalone server setup (legacy)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Test inbound MCP
node -e "import('@mcp/core').then(m => m.mcpManager.debugState())"

# Test plan registry
node -e "import('@mcp/core').then(m => console.log(m.planRegistry.getAllPlans()))"
```

## Migration Notes

### From Old Tool System

Previously, tools were hard-coded in tool definitions. Now:

1. **Register plans** instead of defining tools:
   ```typescript
   // Old: Define each tool manually
   // New: Register plan, tools auto-discovered
   planRegistry.registerPlan('chat', 'messaging', chatPlan);
   ```

2. **Use meta-tools** for discovery:
   ```typescript
   // Old: Client needs to know all tools upfront
   // New: Client calls discover_plans to see what's available
   ```

3. **Tool execution** routes through plan registry:
   ```typescript
   // Old: Direct tool execution
   // New: call_plan routes to plan method
   ```

## License

Part of the LAMA project.
