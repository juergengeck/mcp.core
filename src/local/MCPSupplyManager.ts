/**
 * MCPSupplyManager
 * Manages MCP supplies (offers of MCP service)
 * Creates MCPSupply objects and issues credentials on demand match
 * Node.js only
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject, getIdObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import { calculateIdHashOfObj } from '@refinio/one.core/lib/util/object.js';
import type { MCPSupply, MCPDemand, MCPCredential } from '../remote/types.js';

export interface MCPSupplyManagerDependencies {
  myPersonId: SHA256IdHash;
  sendCredential: (targetPersonId: SHA256IdHash, credential: MCPCredential) => Promise<void>;
}

export class MCPSupplyManager {
  private deps: MCPSupplyManagerDependencies;
  // Map: topicId -> MCPSupply
  private supplies: Map<string, MCPSupply> = new Map();
  // Map: topicId -> Set of consumer person IDs with credentials
  private issuedCredentials: Map<string, Set<string>> = new Map();

  constructor(deps: MCPSupplyManagerDependencies) {
    this.deps = deps;
  }

  /**
   * Create a supply (offer MCP service in a topic)
   * Called when user enables MCP in chat context menu
   */
  async createSupply(topicId: SHA256IdHash, allowedTools?: string[]): Promise<MCPSupply> {
    const supply: MCPSupply = {
      $type$: 'MCPSupply',
      topicId,
      providerPersonId: this.deps.myPersonId,
      allowedTools,
      createdAt: Date.now()
    };

    await storeVersionedObject(supply as any);
    this.supplies.set(String(topicId), supply);

    return supply;
  }

  /**
   * Remove a supply (disable MCP in a topic)
   */
  async removeSupply(topicId: SHA256IdHash): Promise<void> {
    this.supplies.delete(String(topicId));
    // Note: Should also revoke all issued credentials for this topic
    // This would be done by sending revocation messages to all consumers
  }

  /**
   * Check if we're offering MCP in a topic
   */
  hasSupply(topicId: SHA256IdHash): boolean {
    return this.supplies.has(String(topicId));
  }

  /**
   * Get supply for a topic
   */
  getSupply(topicId: SHA256IdHash): MCPSupply | undefined {
    return this.supplies.get(String(topicId));
  }

  /**
   * Handle incoming demand from a remote user
   * Issues credential if we have a matching supply
   */
  async handleDemand(demand: MCPDemand): Promise<MCPCredential | null> {
    const topicKey = String(demand.topicId);
    const supply = this.supplies.get(topicKey);

    if (!supply) {
      // We don't offer MCP in this topic
      return null;
    }

    // Check if we already issued a credential to this consumer
    const consumerKey = String(demand.requesterPersonId);
    const topicCredentials = this.issuedCredentials.get(topicKey);
    if (topicCredentials?.has(consumerKey)) {
      // Already issued
      return null;
    }

    // Issue credential
    const credential: MCPCredential = {
      $type$: 'MCPCredential',
      topicId: demand.topicId,
      providerPersonId: this.deps.myPersonId,
      consumerPersonId: demand.requesterPersonId,
      allowedTools: supply.allowedTools,
      issuedAt: Date.now()
    };

    await storeVersionedObject(credential as any);

    // Track issued credential
    if (!this.issuedCredentials.has(topicKey)) {
      this.issuedCredentials.set(topicKey, new Set());
    }
    this.issuedCredentials.get(topicKey)!.add(consumerKey);

    // Send credential to consumer
    await this.deps.sendCredential(demand.requesterPersonId, credential);

    return credential;
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(topicId: SHA256IdHash, consumerPersonId: SHA256IdHash): Promise<void> {
    const topicKey = String(topicId);
    const consumerKey = String(consumerPersonId);

    const topicCredentials = this.issuedCredentials.get(topicKey);
    if (topicCredentials) {
      topicCredentials.delete(consumerKey);
    }

    // Create revoked credential to send
    const revokedCredential: MCPCredential = {
      $type$: 'MCPCredential',
      topicId,
      providerPersonId: this.deps.myPersonId,
      consumerPersonId,
      issuedAt: 0, // Will be looked up
      revokedAt: Date.now()
    };

    await this.deps.sendCredential(consumerPersonId, revokedCredential);
  }

  /**
   * Check if a consumer has a valid credential
   */
  hasValidCredential(topicId: SHA256IdHash, consumerPersonId: SHA256IdHash): boolean {
    const topicKey = String(topicId);
    const consumerKey = String(consumerPersonId);

    const topicCredentials = this.issuedCredentials.get(topicKey);
    return topicCredentials?.has(consumerKey) ?? false;
  }
}

export default MCPSupplyManager;
