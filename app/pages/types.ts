// types.ts
export interface UserStoryData {
  artifact_id?: string;
  artifact_title?: string;
  artifact_title_ids?: string[];
  date?: string;
  time?: string;
  user_email?: string;
  mode_name?: string;
  widget_name?: string;
  project_name?: string;
  user_story_type?: string;
  status?: 'success' | 'failed' | 'pending';
  created_at?: string;
  updated_at?: string;
}

export interface TimeWindow {
  label: string;
  hours?: number;
  days?: number;
  custom?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export type Environment = 'dev' | 'prod';

export const getArtifactUrl = (artifactId: string, environment: Environment, modeName: string): string => {
  const baseUrl = environment === 'dev' ? 'https://dev.appmod.ai' : 'https://appmod.ai';
  const encodedModeName = encodeURIComponent('Requirement AI');
  return `${baseUrl}/artifact/${artifactId}/mode/${encodedModeName}`;
};

// New Prompt Management Types
export interface PromptVersion {
  _id?: string;  // MongoDB ObjectId as string
  promptId: string;
  flow: string;
  feature: string;
  mode: 'chat' | 'stormee';
  type: string;
  version: number;
  prompt: string;
  metadata: {
    author?: string;
    changelog?: string;
    tokens?: number;
    displayDate?: string;
    displayTime?: string;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PromptFormData {
  promptId: string;
  flow: string;
  feature: string;
  mode: 'chat' | 'stormee';
  type: string;
  prompt: string;
  metadata: {
    author?: string;
    changelog?: string;
    tokens?: number;
  };
}

export interface PromptFilterState {
  flow?: string;
  feature?: string;
  mode?: 'chat' | 'stormee';
  type?: string;
  search?: string;
}

// UserStory Types based on your actual enum
export const USER_STORY_TYPES = [
  'Backend Technical User Story',
  'Enhance a feature',
  'Document a feature', 
  'Fix a bug',
  'Architecture Diagram Description',
  'Knowledge Base Documentation',
  'HVPD',
  'Request Analysis',
  'RM Handoff',
  'Techo - Fixed Bid Sow - Project description & Deliverables',
  'Techo - Fixed Bid Sow - Assumptions',
  'Techo - Fixed Bid Sow - Out of Scopes',
  'Techo - Fixed Bid Sow - Activities',
  'Script Generation',
  'QnA'
] as const;

export type UserStoryType = typeof USER_STORY_TYPES[number];

// Interface for dynamic flow/feature discovery
export interface FlowFeatureStructure {
  flows: string[];
  flowFeatures: Record<string, string[]>; // flow -> features[]
  flowFeatureModeTypes: Record<string, Record<string, Record<string, string[]>>>; // flow -> feature -> mode -> types[]
}

// Helper functions for dynamic data from existing prompts
export const getUniqueFlows = (prompts: PromptVersion[]): string[] => {
  const flows = prompts.map(p => p.flow).filter(Boolean);
  return [...new Set(flows)].sort();
};

export const getFeaturesByFlow = (prompts: PromptVersion[], flow: string): string[] => {
  const features = prompts
    .filter(p => p.flow === flow)
    .map(p => p.feature)
    .filter(Boolean);
  return [...new Set(features)].sort();
};

export const getTypesByFlowFeatureMode = (
  prompts: PromptVersion[], 
  flow: string, 
  feature: string, 
  mode: 'chat' | 'stormee'
): string[] => {
  const types = prompts
    .filter(p => p.flow === flow && p.feature === feature && p.mode === mode)
    .map(p => p.type)
    .filter(Boolean);
  
  // Add UserStoryTypes if this is a userstory related prompt
  const uniqueTypes = [...new Set(types)].sort();
  
  // If no types found, suggest some common ones
  if (uniqueTypes.length === 0) {
    return ['userstory_generator', 'acceptance_criteria', 'test_scenarios'];
  }
  
  return uniqueTypes;
};

// Validation helpers
export const isValidUserStoryType = (type: string): boolean => {
  return USER_STORY_TYPES.includes(type as UserStoryType);
};

export const normalizePromptId = (flow: string, feature: string, mode: string, type: string): string => {
  return `${flow}-${feature}-${mode}-${type}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
};

// Common type suggestions (can be extended)
export const COMMON_PROMPT_TYPES = [
  'userstory_generator',
  'acceptance_criteria', 
  'test_scenarios',
  'documentation_generator',
  'code_review',
  'architecture_design',
  'bug_analysis',
  'feature_planning',
  'project_scope',
  'technical_analysis'
];

// Empty placeholder functions for when structure needs to be built
export const createNewFlow = (flowName: string): string => {
  return flowName.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

export const createNewFeature = (featureName: string): string => {
  return featureName.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

export const createNewType = (typeName: string): string => {
  return typeName.toLowerCase().replace(/[^a-z0-9]/g, '_');
};