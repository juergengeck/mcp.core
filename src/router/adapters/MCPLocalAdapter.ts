/**
 * MCPLocalAdapter
 * Adapts MCP Local Server tool calls to PlanRouter calls
 *
 * Converts MCP tool names like 'send_message' to plan/method calls like 'chat:sendMessage'
 * This replaces the switch statement in MCPLocalServer and MCPToolExecutor
 */

import type { RequestContext, PlanResult } from '../types.js';
import type { PlanRouter } from '../PlanRouter.js';

/**
 * Mapping from MCP tool names to plan:method format
 * Tool names use snake_case, plan methods use camelCase
 */
const TOOL_TO_PLAN_MAP: Record<string, { plan: string; method: string }> = {
  // Chat operations
  send_message: { plan: 'chat', method: 'sendMessage' },
  get_messages: { plan: 'chat', method: 'getMessages' },
  list_topics: { plan: 'chat', method: 'listTopics' },

  // Contact operations
  get_contacts: { plan: 'contacts', method: 'getContacts' },
  search_contacts: { plan: 'contacts', method: 'searchContacts' },

  // Connection operations
  list_connections: { plan: 'connections', method: 'listConnections' },
  create_invitation: { plan: 'connections', method: 'createInvitation' },

  // LLM operations
  list_models: { plan: 'llm', method: 'listModels' },
  load_model: { plan: 'llm', method: 'loadModel' },

  // AI Assistant operations
  create_ai_topic: { plan: 'ai-assistant', method: 'createAITopic' },
  generate_ai_response: { plan: 'ai-assistant', method: 'generateResponse' },

  // Chat Memory operations
  enable_chat_memories: { plan: 'chat-memory', method: 'enableMemories' },
  disable_chat_memories: { plan: 'chat-memory', method: 'disableMemories' },
  toggle_chat_memories: { plan: 'chat-memory', method: 'toggleMemories' },
  extract_chat_subjects: { plan: 'chat-memory', method: 'extractSubjects' },
  find_chat_memories: { plan: 'chat-memory', method: 'findRelatedMemories' },
  get_chat_memory_status: { plan: 'chat-memory', method: 'getMemoryStatus' },

  // Memory/Subject storage operations
  store_subject: { plan: 'memory', method: 'createSubject' },
  retrieve_subject: { plan: 'memory', method: 'getSubject' },
  list_subjects: { plan: 'memory', method: 'listSubjects' },
  update_subject: { plan: 'memory', method: 'updateSubject' },
  delete_subject: { plan: 'memory', method: 'deleteSubject' },
  export_subject_html: { plan: 'memory', method: 'getSubjectHtml' },

  // Keyword operations
  get_keywords: { plan: 'topic-analysis', method: 'getKeywords' },
  extract_keywords: { plan: 'topic-analysis', method: 'extractKeywords' },
  extract_realtime_keywords: { plan: 'topic-analysis', method: 'extractRealtimeKeywords' },
  extract_conversation_keywords: { plan: 'topic-analysis', method: 'extractConversationKeywords' },
  get_keyword_details: { plan: 'keywords', method: 'getKeywordDetails' },
  update_keyword_access_state: { plan: 'keywords', method: 'updateKeywordAccessState' },

  // Proposal operations
  get_proposals_for_topic: { plan: 'proposals', method: 'getForTopic' },
  get_proposals_for_input: { plan: 'proposals', method: 'getForInput' },
  share_proposal: { plan: 'proposals', method: 'share' },
  dismiss_proposal: { plan: 'proposals', method: 'dismiss' },
  get_proposal_config: { plan: 'proposals', method: 'getConfig' },
  update_proposal_config: { plan: 'proposals', method: 'updateConfig' },

  // Topic Analysis operations
  analyze_messages: { plan: 'topic-analysis', method: 'analyzeMessages' },
  get_subjects: { plan: 'topic-analysis', method: 'getSubjects' },
  get_summary: { plan: 'topic-analysis', method: 'getSummary' },
  update_summary: { plan: 'topic-analysis', method: 'updateSummary' },
  get_conversation_restart_context: { plan: 'topic-analysis', method: 'getConversationRestartContext' },
  merge_subjects: { plan: 'topic-analysis', method: 'mergeSubjects' },

  // Subject operations (distinct from topic-analysis subjects)
  create_subject: { plan: 'subjects', method: 'createSubject' },
  attach_subject: { plan: 'subjects', method: 'attachSubject' },
  get_subjects_for_content: { plan: 'subjects', method: 'getForContent' },
  search_subjects: { plan: 'subjects', method: 'search' },
  get_all_subjects: { plan: 'subjects', method: 'getAll' },
  get_subject_resonance: { plan: 'subjects', method: 'getResonance' },
  extract_subjects: { plan: 'subjects', method: 'extract' }
};

export interface MCPLocalAdapterDependencies {
  router: PlanRouter;
  getCallerId: () => string;
  getCredentialId?: () => string | undefined;
}

/**
 * MCP tool result format (matches MCP SDK)
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export class MCPLocalAdapter {
  private router: PlanRouter;
  private getCallerId: () => string;
  private getCredentialId?: () => string | undefined;

  constructor(deps: MCPLocalAdapterDependencies) {
    this.router = deps.router;
    this.getCallerId = deps.getCallerId;
    this.getCredentialId = deps.getCredentialId;
  }

  /**
   * Map an MCP tool name to plan:method format
   */
  mapToolToPlan(toolName: string): { plan: string; method: string } | null {
    return TOOL_TO_PLAN_MAP[toolName] || null;
  }

  /**
   * Handle an MCP tool call
   * This is the main entry point for MCP tool requests
   */
  async handle(
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<MCPToolResult> {
    const mapping = this.mapToolToPlan(toolName);

    if (!mapping) {
      return this.createErrorResult(`Unknown tool: ${toolName}`);
    }

    const { plan, method } = mapping;

    // Create request context for MCP local calls
    const context: RequestContext = {
      callerId: this.getCallerId(),
      callerType: 'llm', // MCP local is typically used by LLM clients
      entryPoint: 'mcp-local',
      topicId: args.topicId || args.conversationId,
      conversationId: args.conversationId,
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      credentialId: this.getCredentialId?.()
    };

    // Route to plan method
    const result = await this.router.call(context, plan, method, args);

    // Convert PlanResult to MCPToolResult
    return this.convertToMCPResult(result);
  }

  /**
   * Convert PlanResult to MCP tool result format
   */
  private convertToMCPResult(result: PlanResult): MCPToolResult {
    if (!result.success) {
      return this.createErrorResult(result.error || 'Unknown error');
    }

    // Handle different data types
    const data = result.data;

    if (typeof data === 'string') {
      return {
        content: [{ type: 'text', text: data }]
      };
    }

    if (data === undefined || data === null) {
      return {
        content: [{ type: 'text', text: 'Operation completed successfully' }]
      };
    }

    // Convert objects/arrays to JSON
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
    };
  }

  /**
   * Create an error result in MCP format
   */
  private createErrorResult(message: string): MCPToolResult {
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true
    };
  }

  /**
   * Get all available MCP tools derived from registered plans
   * Returns tool definitions in MCP format
   */
  getAvailableTools(): Array<{
    name: string;
    description: string;
    inputSchema: any;
  }> {
    const registry = this.router.getRegistry();
    const tools: Array<{ name: string; description: string; inputSchema: any }> = [];

    // Build reverse map: plan:method -> toolName
    const planMethodToTool = new Map<string, string>();
    for (const [toolName, mapping] of Object.entries(TOOL_TO_PLAN_MAP)) {
      planMethodToTool.set(`${mapping.plan}:${mapping.method}`, toolName);
    }

    // Get all plans and their methods
    for (const plan of registry.getAllPlans()) {
      for (const method of plan.methods) {
        const key = `${plan.name}:${method.name}`;
        const toolName = planMethodToTool.get(key);

        if (toolName) {
          // Convert PlanMethod params to MCP inputSchema format
          const inputSchema = this.convertParamsToSchema(method.params);

          tools.push({
            name: toolName,
            description: method.description || `${plan.name} ${method.name}`,
            inputSchema
          });
        }
      }
    }

    return tools;
  }

  /**
   * Convert PlanMethod params format to MCP inputSchema format
   */
  private convertParamsToSchema(
    params?: Record<string, { type: string; description?: string; required?: boolean }>
  ): any {
    if (!params) {
      return { type: 'object', properties: {} };
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [paramName, paramDef] of Object.entries(params)) {
      properties[paramName] = {
        type: paramDef.type,
        description: paramDef.description
      };
      if (paramDef.required) {
        required.push(paramName);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  /**
   * Check if a tool is available
   */
  hasTool(toolName: string): boolean {
    return TOOL_TO_PLAN_MAP[toolName] !== undefined;
  }

  /**
   * Create an MCP request handler for use with MCP SDK Server
   * Returns a handler compatible with server.setRequestHandler(CallToolRequestSchema, handler)
   */
  createMCPRequestHandler(): (request: any) => Promise<MCPToolResult> {
    return async (request: any) => {
      const { name, arguments: args } = request.params;
      return await this.handle(name, args || {});
    };
  }
}

export default MCPLocalAdapter;
