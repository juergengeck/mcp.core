/**
 * Plan Registry for MCP
 *
 * Central registry of all platform-agnostic plan instances.
 * Plans are registered by platform implementations (lama.cube, lama.browser, etc.)
 * and exposed via MCP meta-tools.
 *
 * Pattern:
 * - Plans are platform-agnostic business logic (chat.core, lama.core, etc.)
 * - Platform creates plan instances with injected dependencies
 * - Platform registers plans with this registry
 * - MCP tools discover and call plan methods dynamically
 */

export interface PlanMethod {
  name: string;
  description?: string;
  params?: Record<string, {
    type: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface PlanInfo {
  name: string;
  category: string;
  description?: string;
  methods: PlanMethod[];
  instance: any;  // The actual plan instance
}

export class PlanRegistry {
  private plans: Map<string, PlanInfo> = new Map();

  /**
   * Register a plan instance
   * @param name Plan name (e.g., "chat", "contacts", "ai")
   * @param category Plan category (e.g., "messaging", "contacts", "llm")
   * @param instance The plan instance (e.g., ChatPlan, ContactsPlan)
   * @param description Optional description
   */
  registerPlan(
    name: string,
    category: string,
    instance: any,
    description?: string
  ): void {
    // Discover methods from the plan instance
    const methods = this.discoverMethods(instance);

    this.plans.set(name, {
      name,
      category,
      description,
      methods,
      instance
    });

    console.log(`[PlanRegistry] Registered plan: ${name} (${methods.length} methods)`);
  }

  /**
   * Discover methods from a plan instance
   * Introspects the instance to find callable methods
   */
  private discoverMethods(instance: any): PlanMethod[] {
    const methods: PlanMethod[] = [];
    const proto = Object.getPrototypeOf(instance);

    // Get all method names from the prototype
    const methodNames = Object.getOwnPropertyNames(proto).filter(name => {
      // Skip constructor and private methods (starting with _)
      if (name === 'constructor' || name.startsWith('_')) {
        return false;
      }

      // Only include functions
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      return descriptor && typeof descriptor.value === 'function';
    });

    for (const methodName of methodNames) {
      methods.push({
        name: methodName,
        description: `Call ${methodName} on the plan`
      });
    }

    return methods;
  }

  /**
   * Get all registered plans
   */
  getAllPlans(): PlanInfo[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get a specific plan by name
   */
  getPlan(name: string): PlanInfo | undefined {
    return this.plans.get(name);
  }

  /**
   * Check if a plan exists
   */
  hasPlan(name: string): boolean {
    return this.plans.has(name);
  }

  /**
   * Call a method on a plan
   * @param planName Plan name (e.g., "chat")
   * @param methodName Method name (e.g., "sendMessage")
   * @param params Parameters to pass to the method
   */
  async callPlanMethod(
    planName: string,
    methodName: string,
    params: any = {}
  ): Promise<any> {
    const plan = this.plans.get(planName);

    if (!plan) {
      throw new Error(`Plan not found: ${planName}`);
    }

    const method = plan.instance[methodName];

    if (!method || typeof method !== 'function') {
      throw new Error(`Method not found: ${planName}.${methodName}`);
    }

    // Call the method with params
    return await method.call(plan.instance, params);
  }

  /**
   * Get methods for a specific plan
   */
  getPlanMethods(planName: string): PlanMethod[] {
    const plan = this.plans.get(planName);
    return plan ? plan.methods : [];
  }

  /**
   * Clear all registered plans
   */
  clear(): void {
    this.plans.clear();
  }
}

// Singleton instance
export const planRegistry = new PlanRegistry();
