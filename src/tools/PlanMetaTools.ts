/**
 * Plan Meta-Tools for MCP
 *
 * Meta-tools that let LLMs discover and use available plan methods dynamically.
 * This prevents cluttering the MCP prompt with hundreds of tool definitions.
 *
 * Pattern:
 * 1. LLM calls discover_plans to see what's available
 * 2. LLM chooses appropriate plan and calls call_plan with method name
 * 3. Meta-tool routes to the actual plan method
 */

import type { MCPToolDefinition, MCPToolResult } from '../interface/types.js';
import { planRegistry } from './PlanRegistry.js';

/**
 * Get tool definitions for plan meta-tools
 */
export function getPlanMetaToolDefinitions(): MCPToolDefinition[] {
  return [
    {
      name: 'discover_plans',
      description: 'Discover all available LAMA plans and their methods. Use this first to see what capabilities are available.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional: Filter by category (e.g., "messaging", "contacts", "llm")'
          }
        }
      }
    },
    {
      name: 'call_plan',
      description: 'Call a method on a LAMA plan. Use discover_plans first to see available plans and methods.',
      inputSchema: {
        type: 'object',
        properties: {
          plan: {
            type: 'string',
            description: 'Plan name (e.g., "chat", "contacts", "ai")'
          },
          method: {
            type: 'string',
            description: 'Method name (e.g., "sendMessage", "createConversation")'
          },
          params: {
            type: 'object',
            description: 'Parameters to pass to the method'
          }
        },
        required: ['plan', 'method']
      }
    }
  ];
}

/**
 * Handle discover_plans tool call
 */
export async function handleDiscoverPlans(args: {
  category?: string;
}): Promise<MCPToolResult> {
  try {
    let plans = planRegistry.getAllPlans();

    // Filter by category if specified
    if (args.category) {
      plans = plans.filter(p => p.category === args.category);
    }

    // Format for display
    const planList = plans.map(plan => ({
      name: plan.name,
      category: plan.category,
      description: plan.description || `${plan.name} plan`,
      methods: plan.methods.map(m => m.name)
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalPlans: plans.length,
          plans: planList
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error discovering plans: ${(error as Error).message}`
      }],
      isError: true
    };
  }
}

/**
 * Handle call_plan tool call
 */
export async function handleCallPlan(args: {
  plan: string;
  method: string;
  params?: any;
}): Promise<MCPToolResult> {
  try {
    const { plan, method, params = {} } = args;

    console.log(`[PlanMetaTools] Calling ${plan}.${method}`, params);

    const result = await planRegistry.callPlanMethod(plan, method, params);

    // Format result for MCP
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error calling plan method: ${(error as Error).message}`
      }],
      isError: true
    };
  }
}
