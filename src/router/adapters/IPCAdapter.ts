/**
 * IPCPlanAdapter
 * Adapts IPC channel calls to PlanRouter calls
 *
 * Converts IPC channel names like 'chat:sendMessage' to plan/method calls
 */

import type { RequestContext, PlanResult } from '../types.js';
import type { PlanRouter } from '../PlanRouter.js';

export interface IPCAdapterDependencies {
  router: PlanRouter;
  getCallerId: () => string;
}

export class IPCAdapter {
  private router: PlanRouter;
  private getCallerId: () => string;

  constructor(deps: IPCAdapterDependencies) {
    this.router = deps.router;
    this.getCallerId = deps.getCallerId;
  }

  /**
   * Parse an IPC channel name into plan and method
   * e.g., 'chat:sendMessage' → { plan: 'chat', method: 'sendMessage' }
   */
  parseChannel(channel: string): { plan: string; method: string } | null {
    const parts = channel.split(':');
    if (parts.length !== 2) {
      return null;
    }
    return { plan: parts[0], method: parts[1] };
  }

  /**
   * Handle an IPC call
   * This is the main entry point for IPC requests
   */
  async handle(
    channel: string,
    params: any = {}
  ): Promise<PlanResult> {
    const parsed = this.parseChannel(channel);

    if (!parsed) {
      return {
        success: false,
        error: `Invalid IPC channel format: ${channel}. Expected 'plan:method'`
      };
    }

    const { plan, method } = parsed;

    // Create request context
    const context: RequestContext = {
      callerId: this.getCallerId(),
      callerType: 'user',
      entryPoint: 'ipc',
      topicId: params.topicId || params.conversationId,
      conversationId: params.conversationId,
      timestamp: Date.now(),
      requestId: crypto.randomUUID()
    };

    // Route to plan method
    return await this.router.call(context, plan, method, params);
  }

  /**
   * Create an IPC handler function for a specific channel
   * For use with Electron's ipcMain.handle()
   */
  createHandler(channel: string): (event: any, params: any) => Promise<PlanResult> {
    return async (_event: any, params: any) => {
      return await this.handle(channel, params);
    };
  }

  /**
   * Get all registered plan methods as IPC channel names
   * Returns channels in 'plan:method' format
   */
  getAvailableChannels(): string[] {
    const registry = this.router.getRegistry();
    const channels: string[] = [];

    for (const plan of registry.getAllPlans()) {
      for (const method of plan.methods) {
        channels.push(`${plan.name}:${method.name}`);
      }
    }

    return channels;
  }
}

export default IPCAdapter;
