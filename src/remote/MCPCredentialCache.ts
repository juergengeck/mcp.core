/**
 * MCPCredentialCache
 * Caches MCP credentials for fast lookup
 * Answers: "Can I call MCP on person X in topic Y?"
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { MCPCredential } from './types.js';

export class MCPCredentialCache {
  // Map: topicId -> Map: providerPersonId -> credential
  private cache: Map<string, Map<string, MCPCredential>> = new Map();

  /**
   * Add or update a credential in the cache
   */
  addCredential(credential: MCPCredential): void {
    const topicKey = String(credential.topicId);
    const providerKey = String(credential.providerPersonId);

    if (!this.cache.has(topicKey)) {
      this.cache.set(topicKey, new Map());
    }

    this.cache.get(topicKey)!.set(providerKey, credential);
  }

  /**
   * Remove a credential from the cache
   */
  removeCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): void {
    const topicKey = String(topicId);
    const providerKey = String(providerPersonId);

    const topicCredentials = this.cache.get(topicKey);
    if (topicCredentials) {
      topicCredentials.delete(providerKey);
      if (topicCredentials.size === 0) {
        this.cache.delete(topicKey);
      }
    }
  }

  /**
   * Check if we have a valid credential to call MCP on a provider in a topic
   */
  hasCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): boolean {
    const credential = this.getCredential(topicId, providerPersonId);
    if (!credential) return false;
    if (credential.revokedAt) return false;
    return true;
  }

  /**
   * Get credential for a provider in a topic
   */
  getCredential(topicId: SHA256IdHash, providerPersonId: SHA256IdHash): MCPCredential | undefined {
    const topicKey = String(topicId);
    const providerKey = String(providerPersonId);

    return this.cache.get(topicKey)?.get(providerKey);
  }

  /**
   * Get all providers offering MCP in a topic
   */
  getProvidersInTopic(topicId: SHA256IdHash): SHA256IdHash[] {
    const topicKey = String(topicId);
    const topicCredentials = this.cache.get(topicKey);

    if (!topicCredentials) return [];

    return Array.from(topicCredentials.values())
      .filter(c => !c.revokedAt)
      .map(c => c.providerPersonId);
  }

  /**
   * Check if a tool is allowed by credential
   */
  isToolAllowed(topicId: SHA256IdHash, providerPersonId: SHA256IdHash, toolName: string): boolean {
    const credential = this.getCredential(topicId, providerPersonId);
    if (!credential) return false;
    if (credential.revokedAt) return false;

    // If no allowedTools specified, all tools are allowed
    if (!credential.allowedTools || credential.allowedTools.length === 0) {
      return true;
    }

    return credential.allowedTools.includes(toolName);
  }

  /**
   * Clear all cached credentials
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get count of cached credentials
   */
  get size(): number {
    let count = 0;
    for (const topicCredentials of this.cache.values()) {
      count += topicCredentials.size;
    }
    return count;
  }
}

export default MCPCredentialCache;
