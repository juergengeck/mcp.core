/**
 * Policy Recipes
 * ONE.core object type definitions for policy objects
 */

/**
 * PolicySupply Recipe - defines what access is available
 * Supplies are created by the Node.js owner
 */
export const PolicySupplyRecipe = {
  $type$: 'Recipe' as const,
  name: 'PolicySupply',
  rule: [
    {
      itemprop: 'id',
      itemtype: { type: 'string' },
      isId: true
    },
    {
      itemprop: 'name',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'priority',
      itemtype: { type: 'integer' }
    },
    {
      itemprop: 'plans',
      itemtype: { type: 'bag', item: { type: 'string' } },
      optional: true
    },
    {
      itemprop: 'methods',
      itemtype: { type: 'bag', item: { type: 'string' } },
      optional: true
    },
    {
      itemprop: 'allowedCallerTypes',
      itemtype: { type: 'bag', item: { type: 'string' } },
      optional: true
    },
    {
      itemprop: 'allowedEntryPoints',
      itemtype: { type: 'bag', item: { type: 'string' } },
      optional: true
    },
    {
      itemprop: 'allowedTopics',
      itemtype: { type: 'bag', item: { type: 'string' } },
      optional: true
    },
    {
      itemprop: 'action',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'rateLimitMaxRequests',
      itemtype: { type: 'integer' },
      optional: true
    },
    {
      itemprop: 'rateLimitWindowMs',
      itemtype: { type: 'integer' },
      optional: true
    },
    {
      itemprop: 'rateLimitKeyBy',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'createdAt',
      itemtype: { type: 'integer' }
    },
    {
      itemprop: 'updatedAt',
      itemtype: { type: 'integer' }
    }
  ]
};

/**
 * PolicyDemand Recipe - records access requests and decisions
 */
export const PolicyDemandRecipe = {
  $type$: 'Recipe' as const,
  name: 'PolicyDemand',
  rule: [
    {
      itemprop: 'id',
      itemtype: { type: 'string' },
      isId: true
    },
    {
      itemprop: 'callerId',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'callerType',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'entryPoint',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'plan',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'method',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'topicId',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'timestamp',
      itemtype: { type: 'integer' }
    },
    {
      itemprop: 'matchedSupplyId',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'decision',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'reason',
      itemtype: { type: 'string' },
      optional: true
    }
  ]
};

/**
 * AuditEntry Recipe - logs plan method calls
 */
export const AuditEntryRecipe = {
  $type$: 'Recipe' as const,
  name: 'AuditEntry',
  rule: [
    {
      itemprop: 'id',
      itemtype: { type: 'string' },
      isId: true
    },
    {
      itemprop: 'timestamp',
      itemtype: { type: 'integer' }
    },
    {
      itemprop: 'requestId',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'callerId',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'callerType',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'entryPoint',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'plan',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'method',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'params',
      itemtype: { type: 'string' }  // JSON stringified
    },
    {
      itemprop: 'topicId',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'credentialId',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'decision',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'denyReason',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'executionTimeMs',
      itemtype: { type: 'integer' },
      optional: true
    },
    {
      itemprop: 'success',
      itemtype: { type: 'boolean' },
      optional: true
    },
    {
      itemprop: 'error',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'matchedRules',
      itemtype: { type: 'string' }  // JSON stringified array
    }
  ]
};

/**
 * All policy recipes for registration with ONE.core
 */
export const PolicyRecipes = [
  PolicySupplyRecipe,
  PolicyDemandRecipe,
  AuditEntryRecipe
];
