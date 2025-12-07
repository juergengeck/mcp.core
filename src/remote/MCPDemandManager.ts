/**
 * MCPDemandManager
 * Manages MCP demands (requests for MCP access)
 * Creates MCPDemand objects and receives credentials from suppliers
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import { storeVersionedObject } from '@refinio/one.core/lib/storage-versioned-objects.js';
import type { MCPDemand, MCPCredential } from './types.js';
import { MCPCredentialCache } from './MCPCredentialCache.js';

export class MCPDemandManager {
  private credentialCache: MCPCredentialCache;
  private myPersonId: SHA256IdHash | null = null;

  constructor() {
    this.credentialCache = new MCPCredentialCache();
  }

  /**
   * Initialize with the local user's person ID
   */
  initialize(myPersonId: SHA256IdHash): void {
    this.myPersonId = myPersonId;
  }

  /**
   * Create a demand for MCP access in a topic
   * This signals to Node.js participants that we want MCP access
   */
  async createDemand(topicId: SHA256IdHash): Promise<MCPDemand> {
    if (!this.myPersonId) {
      throw new Error('MCPDemandManager not initialized - call initialize() first');
    }

    const demand: MCPDemand = {
      $type$: 'MCPDemand',
      topicId,
      requesterPersonId: this.myPersonId,
      createdAt: Date.now()
    };

    await storeVersionedObject(demand as any);

    return demand;
  }

  /**
   * Handle incoming credential from a supplier
   * Called when we receive a credential grant
   */
  receiveCredential(credential: MCPCredential): void {
    this.credentialCache.addCredential(credential);
  }

  /**
   * Handle credential revocation
   */
  revokeCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): void {
    this.credentialCache.removeCredential(topicId, providerPersonId);
  }

  /**
   * Check if we have access to a provider's MCP in a topic
   */
  hasAccess(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    return this.credentialCache.hasCredential(topicId, providerPersonId);
  }

  /**
   * Get all providers offering MCP in a topic
   */
  getAvailableProviders(topicId: SHA256IdHash): SHA256IdHash[] {
    return this.credentialCache.getProvidersInTopic(topicId);
  }

  /**
   * Check if a specific tool is allowed
   */
  isToolAllowed(topicId: SHA256IdHash, providerPersonId: SHA256IdHash, toolName: string): boolean {
    return this.credentialCache.isToolAllowed(topicId, providerPersonId, toolName);
  }

  /**
   * Get the credential cache (for advanced use cases)
   */
  getCredentialCache(): MCPCredentialCache {
    return this.credentialCache;
  }
}

export default MCPDemandManager;
