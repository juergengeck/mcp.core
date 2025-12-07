/**
 * MCP Remote Types
 * Types for MCP communication over chat protocol
 */

import type { SHA256Hash, SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';

/**
 * MCPSupply - Node.js user offers MCP service in a chat
 */
export interface MCPSupply {
  $type$: 'MCPSupply';
  topicId: SHA256IdHash;
  providerPersonId: SHA256IdHash;
  allowedTools?: string[];
  createdAt: number;
}

/**
 * MCPDemand - Remote user requests MCP access in a chat
 */
export interface MCPDemand {
  $type$: 'MCPDemand';
  topicId: SHA256IdHash;
  requesterPersonId: SHA256IdHash;
  createdAt: number;
}

/**
 * MCPCredential - Issued when Supply matches Demand
 */
export interface MCPCredential {
  $type$: 'MCPCredential';
  topicId: SHA256IdHash;
  providerPersonId: SHA256IdHash;
  consumerPersonId: SHA256IdHash;
  allowedTools?: string[];
  issuedAt: number;
  revokedAt?: number;
}

/**
 * MCPRequest - Sent in chat to request tool execution
 */
export interface MCPRequest {
  $type$: 'MCPRequest';
  targetPersonId: SHA256IdHash;
  toolCall: SHA256Hash;  // Reference to MCPToolCall object
}

/**
 * MCPResponse - Sent in chat with tool execution result
 */
export interface MCPResponse {
  $type$: 'MCPResponse';
  toolCall: SHA256Hash;  // Which request this answers
  result: SHA256Hash;    // Reference to MCPToolResult object
}

/**
 * MCPToolResult - Stored result of tool execution
 */
export interface MCPToolResultObject {
  $type$: 'MCPToolResult';
  toolCallHash: SHA256Hash;
  success: boolean;
  content: string;  // JSON stringified result
  error?: string;
  executionTime: number;
}
