/**
 * MCPRemoteClient
 * Sends MCP requests via chat to Node.js peers
 * Platform-agnostic - works on browser, mobile, and Node.js
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { getObject } from '@refinio/one.core/lib/storage-unversioned-objects.js';
import type { MCPRequest, MCPResponse, MCPToolResultObject } from './types.js';
import type { MCPDemandManager } from './MCPDemandManager.js';

export interface MCPRemoteClientDependencies {
  demandManager: MCPDemandManager;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
}

export interface MCPToolCallParams {
  toolName: string;
  parameters: Record<string, unknown>;
  topicId: SHA256IdHash;
  targetPersonId: SHA256IdHash;
}

export class MCPRemoteClient {
  private deps: MCPRemoteClientDependencies;
  private pendingRequests: Map<string, {
    resolve: (result: MCPToolResultObject) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();

  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  constructor(deps: MCPRemoteClientDependencies) {
    this.deps = deps;
  }

  /**
   * Call a tool on a remote Node.js peer
   */
  async callTool(params: MCPToolCallParams): Promise<MCPToolResultObject> {
    const { toolName, parameters, topicId, targetPersonId } = params;

    // Verify we have access
    if (!this.deps.demandManager.hasAccess(topicId, targetPersonId)) {
      throw new Error(`No MCP access to ${String(targetPersonId).substring(0, 8)} in topic ${String(topicId).substring(0, 8)}`);
    }

    // Verify tool is allowed
    if (!this.deps.demandManager.isToolAllowed(topicId, targetPersonId, toolName)) {
      throw new Error(`Tool ${toolName} not allowed by credential`);
    }

    // Create and store MCPToolCall object
    const toolCallId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const toolCall = {
      $type$: 'MCPToolCall',
      id: toolCallId,
      toolName,
      parameters: JSON.stringify(parameters),
      timestamp: Date.now(),
      topicId: String(topicId)
    };

    const toolCallResult = await storeVersionedObject(toolCall as any);
    const toolCallHash = toolCallResult.hash as SHA256Hash;

    // Create MCPRequest message
    const request: MCPRequest = {
      $type$: 'MCPRequest',
      targetPersonId,
      toolCall: toolCallHash
    };

    // Set up response promise with timeout
    const responsePromise = new Promise<MCPToolResultObject>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(String(toolCallHash));
        reject(new Error(`MCP request timeout after ${this.REQUEST_TIMEOUT}ms`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(String(toolCallHash), { resolve, reject, timeout });
    });

    // Send request via chat
    await this.deps.sendMessage(topicId, request);

    return responsePromise;
  }

  /**
   * Handle incoming MCPResponse message
   * Called by message handler when we receive a response
   */
  async handleResponse(response: MCPResponse): Promise<void> {
    const toolCallKey = String(response.toolCall);
    const pending = this.pendingRequests.get(toolCallKey);

    if (!pending) {
      console.warn(`[MCPRemoteClient] Received response for unknown request: ${toolCallKey}`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(toolCallKey);

    try {
      // Fetch the result object
      const result = await getObject(response.result) as MCPToolResultObject;
      pending.resolve(result);
    } catch (error) {
      pending.reject(new Error(`Failed to fetch MCP result: ${(error as Error).message}`));
    }
  }

  /**
   * Get list of available MCP providers in a topic
   */
  getAvailableProviders(topicId: SHA256IdHash): SHA256IdHash[] {
    return this.deps.demandManager.getAvailableProviders(topicId);
  }

  /**
   * Check if we have access to a provider
   */
  hasAccess(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    return this.deps.demandManager.hasAccess(topicId, providerPersonId);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [key, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Request cancelled'));
    }
    this.pendingRequests.clear();
  }
}

export default MCPRemoteClient;
