/**
 * MCP Tool Definitions for LAMA
 * Platform-agnostic tool schemas that can be exposed via MCP
 */

import type { MCPToolDefinition, MCPToolCategory } from './types.js';

export interface ToolDefinitionWithCategory extends MCPToolDefinition {
  category: MCPToolCategory;
}

/**
 * Chat Tools
 * Tools for message and topic management
 */
export const chatTools: ToolDefinitionWithCategory[] = [
  {
    name: 'send_message',
    category: 'chat',
    description: 'Send a message in a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'The topic/chat ID to send message to'
        },
        message: {
          type: 'string',
          description: 'The message content to send'
        }
      },
      required: ['topicId', 'message']
    }
  },
  {
    name: 'get_messages',
    category: 'chat',
    description: 'Get messages from a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'The topic/chat ID to get messages from'
        },
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve',
          default: 10
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'list_topics',
    category: 'chat',
    description: 'List all available chat topics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Contact Tools
 * Tools for contact management
 */
export const contactTools: ToolDefinitionWithCategory[] = [
  {
    name: 'get_contacts',
    category: 'contacts',
    description: 'Get list of contacts',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'search_contacts',
    category: 'contacts',
    description: 'Search for contacts by name or ID',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        }
      },
      required: ['query']
    }
  }
];

/**
 * Connection Tools
 * Tools for network connection management
 */
export const connectionTools: ToolDefinitionWithCategory[] = [
  {
    name: 'list_connections',
    category: 'connections',
    description: 'List all network connections',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_invitation',
    category: 'connections',
    description: 'Create a pairing invitation for a new connection',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * LLM Tools
 * Tools for AI model management
 */
export const llmTools: ToolDefinitionWithCategory[] = [
  {
    name: 'list_models',
    category: 'llm',
    description: 'List available AI models',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'load_model',
    category: 'llm',
    description: 'Load an AI model',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: {
          type: 'string',
          description: 'The model ID to load'
        }
      },
      required: ['modelId']
    }
  }
];

/**
 * AI Assistant Tools
 * Tools for AI assistant operations
 */
export const aiAssistantTools: ToolDefinitionWithCategory[] = [
  {
    name: 'create_ai_topic',
    category: 'ai-assistant',
    description: 'Create a new AI-enabled chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: {
          type: 'string',
          description: 'The AI model ID for the topic'
        }
      },
      required: ['modelId']
    }
  },
  {
    name: 'generate_ai_response',
    category: 'ai-assistant',
    description: 'Generate an AI response for a message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to respond to'
        },
        modelId: {
          type: 'string',
          description: 'The AI model to use'
        },
        topicId: {
          type: 'string',
          description: 'Optional topic ID for context'
        }
      },
      required: ['message', 'modelId']
    }
  }
];

/**
 * Memory Tools
 * Tools for storing and retrieving assembly objects with styling and signatures
 */
export const memoryTools: ToolDefinitionWithCategory[] = [
  // Chat-Memory Integration Tools
  {
    name: 'enable_chat_memories',
    category: 'memory',
    description: 'Enable automatic subject extraction and memory creation for a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID to enable memories for'
        },
        autoExtract: {
          type: 'boolean',
          description: 'Automatically extract subjects from new messages',
          default: true
        },
        keywords: {
          type: 'array',
          description: 'Additional keywords to track'
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'disable_chat_memories',
    category: 'memory',
    description: 'Disable memory extraction for a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID to disable memories for'
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'toggle_chat_memories',
    category: 'memory',
    description: 'Toggle memory extraction on/off for a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID to toggle memories for'
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'extract_chat_subjects',
    category: 'memory',
    description: 'Extract subjects from chat messages and store as memories',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID to extract from'
        },
        limit: {
          type: 'number',
          description: 'Number of recent messages to analyze',
          default: 50
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'find_chat_memories',
    category: 'memory',
    description: 'Find related memories for a chat based on keywords',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID'
        },
        keywords: {
          type: 'array',
          description: 'Keywords to search for'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return',
          default: 10
        }
      },
      required: ['topicId', 'keywords']
    }
  },
  {
    name: 'get_chat_memory_status',
    category: 'memory',
    description: 'Get memory extraction status for a chat topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Chat topic ID'
        }
      },
      required: ['topicId']
    }
  },
  // Subject Storage Tools
  {
    name: 'store_subject',
    category: 'memory',
    description: 'Store a subject assembly in memory with optional styling and cryptographic signature',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Unique identifier for the subject'
        },
        name: {
          type: 'string',
          description: 'Subject name/title'
        },
        description: {
          type: 'string',
          description: 'Detailed description of the subject'
        },
        metadata: {
          type: 'object',
          description: 'Key-value metadata pairs'
        },
        sign: {
          type: 'boolean',
          description: 'Sign with verifiable credentials',
          default: false
        },
        theme: {
          type: 'string',
          description: 'HTML theme for styling (light, dark, auto)',
          default: 'auto'
        }
      },
      required: ['id', 'name']
    }
  },
  {
    name: 'retrieve_subject',
    category: 'memory',
    description: 'Retrieve a subject assembly from memory by ID hash',
    inputSchema: {
      type: 'object',
      properties: {
        idHash: {
          type: 'string',
          description: 'The ID hash of the subject to retrieve'
        },
        verifySignature: {
          type: 'boolean',
          description: 'Verify cryptographic signature if present',
          default: false
        }
      },
      required: ['idHash']
    }
  },
  {
    name: 'list_subjects',
    category: 'memory',
    description: 'List all subjects stored in memory',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'update_subject',
    category: 'memory',
    description: 'Update an existing subject assembly',
    inputSchema: {
      type: 'object',
      properties: {
        idHash: {
          type: 'string',
          description: 'The ID hash of the subject to update'
        },
        name: {
          type: 'string',
          description: 'Updated subject name'
        },
        description: {
          type: 'string',
          description: 'Updated description'
        },
        metadata: {
          type: 'object',
          description: 'Updated metadata'
        },
        sign: {
          type: 'boolean',
          description: 'Sign the updated version',
          default: false
        },
        theme: {
          type: 'string',
          description: 'HTML theme (light, dark, auto)',
          default: 'auto'
        }
      },
      required: ['idHash']
    }
  },
  {
    name: 'delete_subject',
    category: 'memory',
    description: 'Delete a subject assembly from memory storage',
    inputSchema: {
      type: 'object',
      properties: {
        idHash: {
          type: 'string',
          description: 'The ID hash of the subject to delete'
        }
      },
      required: ['idHash']
    }
  },
  {
    name: 'export_subject_html',
    category: 'memory',
    description: 'Export a subject as styled HTML for viewing in browser',
    inputSchema: {
      type: 'object',
      properties: {
        idHash: {
          type: 'string',
          description: 'The ID hash of the subject to export'
        }
      },
      required: ['idHash']
    }
  }
];

/**
 * Keyword Tools
 * Tools for keyword extraction and management
 */
export const keywordTools: ToolDefinitionWithCategory[] = [
  {
    name: 'get_keywords',
    category: 'keywords',
    description: 'Get all keywords for a topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to get keywords from'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of keywords to return',
          default: 50
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'extract_keywords',
    category: 'keywords',
    description: 'Extract keywords from text using LLM',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to extract keywords from'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of keywords to extract',
          default: 10
        }
      },
      required: ['text']
    }
  },
  {
    name: 'extract_realtime_keywords',
    category: 'keywords',
    description: 'Extract single-word keywords for real-time display',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to extract keywords from'
        },
        existingKeywords: {
          type: 'array',
          description: 'Existing keywords to exclude from results',
          default: []
        },
        maxKeywords: {
          type: 'number',
          description: 'Maximum number of keywords to extract',
          default: 15
        }
      },
      required: ['text']
    }
  },
  {
    name: 'extract_conversation_keywords',
    category: 'keywords',
    description: 'Extract keywords from all messages in a conversation',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to extract keywords from'
        },
        maxKeywords: {
          type: 'number',
          description: 'Maximum number of keywords to extract',
          default: 15
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'get_keyword_details',
    category: 'keywords',
    description: 'Get keyword details with subjects, access states, and topic references',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to get details for'
        },
        topicId: {
          type: 'string',
          description: 'Optional topic ID for context'
        }
      },
      required: ['keyword']
    }
  },
  {
    name: 'update_keyword_access_state',
    category: 'keywords',
    description: 'Update or create access state for a keyword and principal',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to update access state for'
        },
        topicId: {
          type: 'string',
          description: 'Topic ID'
        },
        principalId: {
          type: 'string',
          description: 'Principal (user/group) ID'
        },
        principalType: {
          type: 'string',
          description: 'Principal type',
          enum: ['user', 'group']
        },
        state: {
          type: 'string',
          description: 'Access state',
          enum: ['allow', 'deny', 'none']
        }
      },
      required: ['keyword', 'topicId', 'principalId', 'principalType', 'state']
    }
  }
];

/**
 * Proposal Tools
 * Tools for context-aware suggestions
 */
export const proposalTools: ToolDefinitionWithCategory[] = [
  {
    name: 'get_proposals_for_topic',
    category: 'proposals',
    description: 'Get proposals for a specific topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to get proposals for'
        },
        currentSubjects: {
          type: 'array',
          description: 'Current subject ID hashes in the conversation'
        },
        forceRefresh: {
          type: 'boolean',
          description: 'Force refresh instead of using cache',
          default: false
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'get_proposals_for_input',
    category: 'proposals',
    description: 'Get proposals based on user input text (real-time)',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID'
        },
        inputText: {
          type: 'string',
          description: 'User input text to analyze'
        }
      },
      required: ['topicId', 'inputText']
    }
  },
  {
    name: 'share_proposal',
    category: 'proposals',
    description: 'Share a proposal into the current conversation',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: {
          type: 'string',
          description: 'Proposal ID to share'
        },
        topicId: {
          type: 'string',
          description: 'Topic ID to share into'
        },
        pastSubjectIdHash: {
          type: 'string',
          description: 'Subject ID hash from the past conversation'
        },
        includeMessages: {
          type: 'boolean',
          description: 'Include messages from past conversation',
          default: false
        }
      },
      required: ['proposalId', 'topicId', 'pastSubjectIdHash']
    }
  },
  {
    name: 'dismiss_proposal',
    category: 'proposals',
    description: 'Dismiss a proposal for the current session',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: {
          type: 'string',
          description: 'Proposal ID to dismiss'
        },
        topicId: {
          type: 'string',
          description: 'Topic ID'
        },
        pastSubjectIdHash: {
          type: 'string',
          description: 'Subject ID hash'
        }
      },
      required: ['proposalId', 'topicId', 'pastSubjectIdHash']
    }
  },
  {
    name: 'get_proposal_config',
    category: 'proposals',
    description: 'Get current user proposal configuration',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'update_proposal_config',
    category: 'proposals',
    description: 'Update user proposal configuration',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'Partial config to update'
        }
      },
      required: ['config']
    }
  }
];

/**
 * Topic Analysis Tools
 * Tools for analyzing topics (subjects, summaries)
 */
export const topicAnalysisTools: ToolDefinitionWithCategory[] = [
  {
    name: 'analyze_messages',
    category: 'topic-analysis',
    description: 'Analyze messages to extract subjects and keywords',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to analyze'
        },
        messages: {
          type: 'array',
          description: 'Optional specific messages to analyze'
        },
        forceReanalysis: {
          type: 'boolean',
          description: 'Force reanalysis even if cached',
          default: false
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'get_subjects',
    category: 'topic-analysis',
    description: 'Get all subjects for a topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to get subjects from'
        },
        includeArchived: {
          type: 'boolean',
          description: 'Include archived subjects',
          default: false
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'get_summary',
    category: 'topic-analysis',
    description: 'Get summary for a topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to get summary for'
        },
        version: {
          type: 'number',
          description: 'Optional specific version number'
        },
        includeHistory: {
          type: 'boolean',
          description: 'Include version history',
          default: false
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'update_summary',
    category: 'topic-analysis',
    description: 'Update or create summary for a topic',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to update summary for'
        },
        content: {
          type: 'string',
          description: 'Summary content'
        },
        changeReason: {
          type: 'string',
          description: 'Reason for the change'
        },
        autoGenerate: {
          type: 'boolean',
          description: 'Auto-generate summary from messages',
          default: false
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'get_conversation_restart_context',
    category: 'topic-analysis',
    description: 'Generate conversation restart context for LLM continuity',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID to get context for'
        }
      },
      required: ['topicId']
    }
  },
  {
    name: 'merge_subjects',
    category: 'topic-analysis',
    description: 'Merge two subjects into one',
    inputSchema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'Topic ID'
        },
        subjectId1: {
          type: 'string',
          description: 'First subject ID to merge'
        },
        subjectId2: {
          type: 'string',
          description: 'Second subject ID to merge'
        }
      },
      required: ['topicId', 'subjectId1', 'subjectId2']
    }
  },
  {
    name: 'create_subject',
    category: 'topic-analysis',
    description: 'Create or update a subject',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Subject name'
        },
        createdBy: {
          type: 'string',
          description: 'Creator identifier'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)',
          default: 1.0
        },
        references: {
          type: 'array',
          description: 'Reference objects'
        }
      },
      required: ['name', 'createdBy']
    }
  },
  {
    name: 'attach_subject',
    category: 'topic-analysis',
    description: 'Attach subject to content',
    inputSchema: {
      type: 'object',
      properties: {
        subjectName: {
          type: 'string',
          description: 'Subject name to attach'
        },
        contentHash: {
          type: 'string',
          description: 'Content hash to attach to'
        },
        attachedBy: {
          type: 'string',
          description: 'Attacher identifier'
        },
        confidence: {
          type: 'number',
          description: 'Confidence score (0-1)',
          default: 1.0
        },
        context: {
          type: 'object',
          description: 'Attachment context'
        }
      },
      required: ['subjectName', 'contentHash', 'attachedBy']
    }
  },
  {
    name: 'get_subjects_for_content',
    category: 'topic-analysis',
    description: 'Get subjects attached to content',
    inputSchema: {
      type: 'object',
      properties: {
        contentHash: {
          type: 'string',
          description: 'Content hash to get subjects for'
        }
      },
      required: ['contentHash']
    }
  },
  {
    name: 'search_subjects',
    category: 'topic-analysis',
    description: 'Search subjects by query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 10
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_all_subjects',
    category: 'topic-analysis',
    description: 'Get all subjects across all topics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_subject_resonance',
    category: 'topic-analysis',
    description: 'Get subject resonance/relationships',
    inputSchema: {
      type: 'object',
      properties: {
        subjectNames: {
          type: 'array',
          description: 'Subject names to analyze'
        },
        topK: {
          type: 'number',
          description: 'Number of top related subjects',
          default: 10
        }
      },
      required: ['subjectNames']
    }
  },
  {
    name: 'extract_subjects',
    category: 'topic-analysis',
    description: 'Extract subjects from text',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to extract subjects from'
        },
        extractor: {
          type: 'string',
          description: 'Extractor type/model to use',
          default: 'llm'
        },
        minConfidence: {
          type: 'number',
          description: 'Minimum confidence threshold',
          default: 0.5
        }
      },
      required: ['text']
    }
  }
];

/**
 * All available tool definitions
 */
export const allTools: ToolDefinitionWithCategory[] = [
  ...chatTools,
  ...contactTools,
  ...connectionTools,
  ...llmTools,
  ...aiAssistantTools,
  ...memoryTools,
  ...keywordTools,
  ...proposalTools,
  ...topicAnalysisTools
];

/**
 * Get tool definitions by category
 */
export function getToolsByCategory(category: MCPToolCategory): ToolDefinitionWithCategory[] {
  return allTools.filter(tool => tool.category === category);
}

/**
 * Get a specific tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinitionWithCategory | undefined {
  return allTools.find(tool => tool.name === name);
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return allTools.map(tool => tool.name);
}
