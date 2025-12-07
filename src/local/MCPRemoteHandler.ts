/**
 * MCPRemoteHandler
 * Handles incoming MCP requests from remote clients
 * Validates credentials, executes tools, sends responses
 * Node.js only
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject, getObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import type { MCPRequest, MCPResponse, MCPToolResultObject } from '../remote/types.js';
import type { MCPSupplyManager } from './MCPSupplyManager.js';
import type { MCPToolExecutor } from '../types/mcp-types.js';

export interface MCPRemoteHandlerDependencies {
  supplyManager: MCPSupplyManager;
  toolExecutor: MCPToolExecutor;
  sendMessage: (topicId: SHA256IdHash, message: any) => Promise<void>;
  myPersonId: SHA256IdHash;
}

export class MCPRemoteHandler {
  private deps: MCPRemoteHandlerDependencies;

  constructor(deps: MCPRemoteHandlerDependencies) {
    this.deps = deps;
  }

  /**
   * Handle incoming MCPRequest message
   * Called by message handler when we receive a request
   */
  async handleRequest(request: MCPRequest, senderPersonId: SHA256IdHash, topicId: SHA256IdHash): Promise<void> {
    // Verify this request is for us
    if (String(request.targetPersonId) !== String(this.deps.myPersonId)) {
      // Not for us, ignore
      return;
    }

    // Verify sender has valid credential
    if (!this.deps.supplyManager.hasValidCredential(topicId, senderPersonId)) {
      console.warn(`[MCPRemoteHandler] Rejecting request from ${String(senderPersonId).substring(0, 8)} - no valid credential`);
      await this.sendErrorResponse(request.toolCall, topicId, 'No valid MCP credential');
      return;
    }

    // Fetch the tool call object
    let toolCall: any;
    try {
      toolCall = await getObject(request.toolCall);
    } catch (error) {
      console.error(`[MCPRemoteHandler] Failed to fetch tool call: ${(error as Error).message}`);
      await this.sendErrorResponse(request.toolCall, topicId, 'Failed to fetch tool call object');
      return;
    }

    // Validate tool is allowed
    const supply = this.deps.supplyManager.getSupply(topicId);
    if (supply?.allowedTools && !supply.allowedTools.includes(toolCall.toolName)) {
      await this.sendErrorResponse(request.toolCall, topicId, `Tool ${toolCall.toolName} not allowed`);
      return;
    }

    // Execute the tool
    const startTime = Date.now();
    let result: MCPToolResultObject;

    try {
      const executionResult = await this.deps.toolExecutor.execute(
        toolCall.toolName,
        JSON.parse(toolCall.parameters),
        { topicId: String(topicId) }
      );

      result = {
        $type$: 'MCPToolResult',
        toolCallHash: request.toolCall,
        success: !executionResult.isError,
        content: JSON.stringify(executionResult.content),
        executionTime: Date.now() - startTime
      };

      if (executionResult.isError) {
        result.error = executionResult.content[0]?.text || 'Unknown error';
      }
    } catch (error) {
      result = {
        $type$: 'MCPToolResult',
        toolCallHash: request.toolCall,
        success: false,
        content: '[]',
        error: (error as Error).message,
        executionTime: Date.now() - startTime
      };
    }

    // Store result
    const storedResult = await storeVersionedObject(result as any);

    // Send response
    const response: MCPResponse = {
      $type$: 'MCPResponse',
      toolCall: request.toolCall,
      result: storedResult.hash as SHA256Hash
    };

    await this.deps.sendMessage(topicId, response);
  }

  /**
   * Send error response for a failed request
   */
  private async sendErrorResponse(toolCallHash: SHA256Hash, topicId: SHA256IdHash, errorMessage: string): Promise<void> {
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

    await this.deps.sendMessage(topicId, response);
  }
}

export default MCPRemoteHandler;
