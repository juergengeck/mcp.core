/**
 * MCPRemoteAdapter
 * Adapts MCP Remote protocol requests to PlanRouter calls
 *
 * Handles incoming MCP requests from remote clients over the network.
 * Validates credentials via PolicyEngine, executes tools via PlanRouter,
 * and sends responses back through the messaging layer.
 *
 * This replaces MCPRemoteHandler's switch statements and credential checking.
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import type { RequestContext, PlanResult } from '../types.js';
import type { PlanRouter } from '../PlanRouter.js';

/**
 * MCP Request message format (from remote client)
 */
export interface MCPRequest {
  $type$: 'MCPRequest';
  toolCall: SHA256Hash;
  targetPersonId: SHA256IdHash;
}

/**
 * MCP Response message format (to remote client)
 */
export interface MCPResponse {
  $type$: 'MCPResponse';
  toolCall: SHA256Hash;
  result: SHA256Hash;
}

/**
 * MCP Tool Result stored object
 */
export interface MCPToolResultObject {
  $type$: 'MCPToolResult';
  toolCallHash: SHA256Hash;
  success: boolean;
  content: string; // JSON-stringified content array
  error?: string;
  executionTime: number;
}

/**
 * Tool call object fetched from storage
 */
interface MCPToolCall {
  $type$: 'MCPToolCall';
  toolName: string;
  parameters: string; // JSON-stringified parameters
}

/**
 * Mapping from MCP tool names to plan:method format
 * Shared with MCPLocalAdapter
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

  // Subject operations
  create_subject: { plan: 'subjects', method: 'createSubject' },
  attach_subject: { plan: 'subjects', method: 'attachSubject' },
  get_subjects_for_content: { plan: 'subjects', method: 'getForContent' },
  search_subjects: { plan: 'subjects', method: 'search' },
  get_all_subjects: { plan: 'subjects', method: 'getAll' },
  get_subject_resonance: { plan: 'subjects', method: 'getResonance' },
  extract_subjects: { plan: 'subjects', method: 'extract' }
};

export interface MCPRemoteAdapterDependencies {
  router: PlanRouter;
  myPersonId: SHA256IdHash;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
  getCredentialForTopic?: (topicId: SHA256IdHash, senderId: SHA256IdHash) => string | undefined;
}

export class MCPRemoteAdapter {
  private router: PlanRouter;
  private myPersonId: SHA256IdHash;
  private sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
  private getCredentialForTopic?: (topicId: SHA256IdHash, senderId: SHA256IdHash) => string | undefined;

  constructor(deps: MCPRemoteAdapterDependencies) {
    this.router = deps.router;
    this.myPersonId = deps.myPersonId;
    this.sendMessage = deps.sendMessage;
    this.getCredentialForTopic = deps.getCredentialForTopic;
  }

  /**
   * Map an MCP tool name to plan:method format
   */
  mapToolToPlan(toolName: string): { plan: string; method: string } | null {
    return TOOL_TO_PLAN_MAP[toolName] || null;
  }

  /**
   * Handle incoming MCPRequest message
   * Called by message handler when we receive a request from a remote client
   */
  async handleRequest(
    request: MCPRequest,
    senderPersonId: SHA256IdHash,
    topicId: SHA256IdHash
  ): Promise<void> {
    // Verify this request is for us
    if (String(request.targetPersonId) !== String(this.myPersonId)) {
      // Not for us, ignore silently
      return;
    }

    // Fetch the tool call object from storage
    let toolCall: MCPToolCall;
    try {
      toolCall = await getObject(request.toolCall) as MCPToolCall;
    } catch (error) {
      console.error(`[MCPRemoteAdapter] Failed to fetch tool call: ${(error as Error).message}`);
      await this.sendErrorResponse(request.toolCall, topicId, 'Failed to fetch tool call object');
      return;
    }

    // Map tool to plan:method
    const mapping = this.mapToolToPlan(toolCall.toolName);
    if (!mapping) {
      await this.sendErrorResponse(request.toolCall, topicId, `Unknown tool: ${toolCall.toolName}`);
      return;
    }

    const { plan, method } = mapping;

    // Parse parameters
    let params: Record<string, any>;
    try {
      params = JSON.parse(toolCall.parameters);
    } catch {
      params = {};
    }

    // Create request context for remote MCP calls
    // The PolicyEngine will validate credentials via policy supplies
    const context: RequestContext = {
      callerId: String(senderPersonId),
      callerType: 'remote',
      entryPoint: 'mcp-remote',
      topicId: String(topicId),
      conversationId: String(topicId),
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      credentialId: this.getCredentialForTopic?.(topicId, senderPersonId)
    };

    // Execute via PlanRouter (handles policy evaluation)
    const startTime = Date.now();
    const result = await this.router.call(context, plan, method, params);
    const executionTime = Date.now() - startTime;

    // Convert result to MCPToolResult and send response
    await this.sendResultResponse(request.toolCall, topicId, result, executionTime);
  }

  /**
   * Send successful result response
   */
  private async sendResultResponse(
    toolCallHash: SHA256Hash,
    topicId: SHA256IdHash,
    result: PlanResult,
    executionTime: number
  ): Promise<void> {
    let resultObj: MCPToolResultObject;

    if (result.success) {
      // Format content as MCP expects
      const content = this.formatResultContent(result.data);
      resultObj = {
        $type$: 'MCPToolResult',
        toolCallHash,
        success: true,
        content: JSON.stringify(content),
        executionTime
      };
    } else {
      resultObj = {
        $type$: 'MCPToolResult',
        toolCallHash,
        success: false,
        content: '[]',
        error: result.error || 'Unknown error',
        executionTime
      };
    }

    const storedResult = await storeVersionedObject(resultObj as any);

    const response: MCPResponse = {
      $type$: 'MCPResponse',
      toolCall: toolCallHash,
      result: storedResult.hash as SHA256Hash
    };

    await this.sendMessage(topicId, response);
  }

  /**
   * Send error response for a failed request
   */
  private async sendErrorResponse(
    toolCallHash: SHA256Hash,
    topicId: SHA256IdHash,
    errorMessage: string
  ): Promise<void> {
    const result: MCPToolResultObject = {
      $type$: 'MCPToolResult',
      toolCallHash,
      success: false,
      content: '[]',
      error: errorMessage,
      executionTime: 0
    };

    const storedResult = await storeVersionedObject(result as any);

    const response: MCPResponse = {
      $type$: 'MCPResponse',
      toolCall: toolCallHash,
      result: storedResult.hash as SHA256Hash
    };

    await this.sendMessage(topicId, response);
  }

  /**
   * Format result data as MCP content array
   */
  private formatResultContent(data: any): Array<{ type: string; text?: string }> {
    if (data === undefined || data === null) {
      return [{ type: 'text', text: 'Operation completed successfully' }];
    }

    if (typeof data === 'string') {
      return [{ type: 'text', text: data }];
    }

    return [{ type: 'text', text: JSON.stringify(data, null, 2) }];
  }

  /**
   * Check if a tool is available
   */
  hasTool(toolName: string): boolean {
    return TOOL_TO_PLAN_MAP[toolName] !== undefined;
  }
}

export default MCPRemoteAdapter;
