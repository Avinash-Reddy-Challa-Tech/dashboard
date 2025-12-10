"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Copy, 
  History, 
  FileText, 
  Save,
  X,
  ChevronDown,
  Loader2,
  Tag,
  Calendar,
  User,
  GitBranch,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Import types
import { 
  PromptVersion, 
  PromptFormData, 
  PromptFilterState, 
  Environment,
  getUniqueFlows,
  getFeaturesByFlow,
  getTypesByFlowFeatureMode,
  USER_STORY_TYPES,
  COMMON_PROMPT_TYPES,
  normalizePromptId
} from './types';

interface PromptManagerProps {
  environment: Environment;
}

// Backend API base URL
const API_BASE_URL = 'http://localhost:8000/backend/userstory_prompts';

export default function PromptManager({ environment }: PromptManagerProps) {
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptVersion | null>(null);
  const [viewingVersions, setViewingVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  
  // Dynamic flow/promptTitle data
  const [availableFlows, setAvailableFlows] = useState<string[]>([]);
  const [availablePromptTitles, setAvailablePromptTitles] = useState<string[]>([]);
  const [availablePromptDescriptions, setAvailablePromptDescriptions] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<PromptFormData>({
    promptId: '',
    flow: '',
    promptTitle: '',
    mode: 'Userstory',
    promptDescription: '',
    prompt: '',
    metadata: {
      author: '',
      changelog: '',
      tokens: 0
    }
  });

  // Filter state
  const [filters, setFilters] = useState<PromptFilterState>({});

  // Load prompts and extract dynamic structure
  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filters.flow) params.append('flow', filters.flow);
      if (filters.promptTitle) params.append('promptTitle', filters.promptTitle);
      if (filters.mode) params.append('mode', filters.mode);
      if (filters.promptDescription) params.append('promptDescription', filters.promptDescription);
      
      // Make request to your existing backend
      const url = params.toString() 
        ? `${API_BASE_URL}/prompt-version?${params.toString()}` 
        : `${API_BASE_URL}/prompt-version`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load prompts: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Handle different response formats from your backend
      let promptsData: PromptVersion[] = [];
      if (Array.isArray(result)) {
        promptsData = result;
      } else if (result.data && Array.isArray(result.data)) {
        promptsData = result.data;
      } else if (result.message === "Prompt not found") {
        promptsData = [];
      } else {
        // Single prompt returned
        promptsData = [result];
      }
      
      setPrompts(promptsData);
      
      // Extract available flows for dropdowns
      setAvailableFlows(getUniqueFlows(promptsData));
      
    } catch (err) {
      console.error('Error loading prompts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load versions for a specific prompt
  const loadVersions = async (promptId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-version?promptId=${promptId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load versions');
      }
      
      const result = await response.json();
      
      // Handle response format
      let versionsData: PromptVersion[] = [];
      if (Array.isArray(result)) {
        versionsData = result;
      } else if (result.data && Array.isArray(result.data)) {
        versionsData = result.data;
      } else {
        versionsData = [result];
      }
      
      // Sort by version descending
      versionsData.sort((a, b) => (b.version || 0) - (a.version || 0));
      
      setVersions(versionsData);
      setViewingVersions(promptId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    }
  };

  // Update available promptTitles when flow changes
  useEffect(() => {
    if (formData.flow && prompts.length > 0) {
      const promptTitles = getFeaturesByFlow(prompts, formData.flow);
      setAvailablePromptTitles(promptTitles);
      // Only reset promptTitle if it's not custom and not available in new flow
      if (
        formData.promptTitle &&
        !promptTitles.includes(formData.promptTitle) &&
        promptTitles.length > 0
      ) {
        setFormData(prev => ({ ...prev, promptTitle: '', promptDescription: '' }));
      }
    } else {
      setAvailablePromptTitles([]);
    }
  }, [formData.flow, prompts]);

  // Auto-generate promptId
  useEffect(() => {
    if (
      formData.flow &&
      formData.promptTitle &&
      formData.mode &&
      formData.promptDescription &&
      !isEditing
    ) {
      const generatedId = normalizePromptId(
        formData.flow,
        formData.promptTitle,
        formData.mode,
        formData.promptDescription
      );
      setFormData(prev => ({ ...prev, promptId: generatedId }));
    }
  }, [formData.flow, formData.promptTitle, formData.mode, formData.promptDescription, isEditing]);

  // Load prompts on component mount and when environment/filters change
  useEffect(() => {
    loadPrompts();
  }, [environment, filters]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (
        !formData.flow.trim() ||
        !formData.promptTitle.trim() ||
        !formData.promptDescription.trim() ||
        !formData.prompt.trim()
      ) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare payload for your backend format
      const payload = {
        promptId:
          formData.promptId ||
          normalizePromptId(
            formData.flow,
            formData.promptTitle,
            formData.mode,
            formData.promptDescription
          ),
        flow: formData.flow,
        promptTitle: formData.promptTitle,
        mode: formData.mode,
        promptDescription: formData.promptDescription,
        prompt: formData.prompt,
        metadata: {
          author: formData.metadata.author || '',
          changelog: formData.metadata.changelog || '',
          tokens: formData.metadata.tokens || 0
        }
      };
      
      const method = isEditing ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE_URL}/prompt-version`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to save prompt');
      }
      
      // Reset form and reload prompts
      setFormData({
        promptId: '',
        flow: '',
        promptTitle: '',
        mode: 'Userstory',
        promptDescription: '',
        prompt: '',
        metadata: { author: '', changelog: '', tokens: 0 }
      });
      setIsDialogOpen(false);
      setIsEditing(false);
      setEditingPrompt(null);
      await loadPrompts();
      
      // Show success message
      setError(null);
      
    } catch (err) {
      console.error('Error saving prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    }
  };

  // Handle edit
  const handleEdit = (prompt: PromptVersion) => {
    setFormData({
      promptId: prompt.promptId,
      flow: prompt.flow,
      promptTitle: prompt.promptTitle,
      mode: prompt.mode,
      promptDescription: prompt.promptDescription,
      prompt: prompt.prompt,
      metadata: prompt.metadata
    });
    setEditingPrompt(prompt);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async (promptId: string, version: number) => {
    if (!confirm('Are you sure you want to delete this prompt version?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/prompt-version?promptId=${promptId}&version=${version}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }
      
      await loadPrompts();
      if (viewingVersions === promptId) {
        await loadVersions(promptId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prompt');
    }
  };

  // Filter prompts based on search
  const filteredPrompts = prompts.filter(prompt => {
    if (!filters.search) return true;
    
    const searchLower = filters.search.toLowerCase();
    return (
      prompt.promptId.toLowerCase().includes(searchLower) ||
      prompt.flow.toLowerCase().includes(searchLower) ||
      prompt.promptTitle.toLowerCase().includes(searchLower) ||
      prompt.mode.toLowerCase().includes(searchLower) ||
      prompt.promptDescription.toLowerCase().includes(searchLower) ||
      prompt.prompt.toLowerCase().includes(searchLower) ||
      prompt.metadata.author?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Prompt Management</h2>
          <p className="text-slate-400">
            Manage and version your AI prompts across flows, titles, and modes
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Backend: {API_BASE_URL}/prompt-version
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setIsEditing(false);
                setEditingPrompt(null);
                setFormData({
                  promptId: '',
                  flow: '',
                  promptTitle: '',
                  mode: 'Userstory',
                  promptDescription: '',
                  prompt: '',
                  metadata: { author: '', changelog: '', tokens: 0 }
                });
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Prompt
            </Button>
          </DialogTrigger>
          
          <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isEditing ? 'Update Prompt (Create New Version)' : 'Create New Prompt'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Flow - Allow free text input for new flows */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Flow *</label>
                  <div className="space-y-2">
                    {availableFlows.length > 0 && (
                      <Select
                        value={availableFlows.includes(formData.flow) ? formData.flow : 'none_selected'}
                        onValueChange={(value) => {
                          if (value === 'custom' || value === 'none_selected') return;
                          setFormData(prev => ({ ...prev, flow: value }));
                        }}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select existing flow" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="none_selected" className="text-slate-400 italic">
                            Select existing flow...
                          </SelectItem>
                          {availableFlows.map((flow) => (
                            <SelectItem key={flow} value={flow} className="text-white">
                              {flow.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom" className="text-blue-400 font-medium">
                            + Create New Flow
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={formData.flow}
                      onChange={(e) => setFormData(prev => ({ ...prev, flow: e.target.value }))}
                      placeholder={availableFlows.length > 0 ? "Or enter new flow name" : "Enter flow name"}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                </div>
                
                {/* Prompt Title - Allow free text input for new titles */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Prompt Title *</label>
                  <div className="space-y-2">
                    {availablePromptTitles.length > 0 && (
                      <Select
                        value={
                          availablePromptTitles.includes(formData.promptTitle)
                            ? formData.promptTitle
                            : 'none_selected'
                        }
                        onValueChange={(value) => {
                          if (value === 'custom' || value === 'none_selected') return;
                          setFormData(prev => ({ ...prev, promptTitle: value }));
                        }}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select existing prompt title" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="none_selected" className="text-slate-400 italic">
                            Select existing prompt title...
                          </SelectItem>
                          {availablePromptTitles.map((title) => (
                            <SelectItem key={title} value={title} className="text-white">
                              {title.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom" className="text-blue-400 font-medium">
                            + Create New Prompt Title
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={formData.promptTitle}
                      onChange={(e) =>
                        setFormData(prev => ({ ...prev, promptTitle: e.target.value }))
                      }
                      placeholder={
                        availablePromptTitles.length > 0
                          ? "Or enter new prompt title"
                          : "Enter prompt title"
                      }
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                </div>
                
                {/* Mode */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Mode *</label>
                  <Select
                    value={formData.mode}
                    onValueChange={(
                      value:
                        | 'CRA'
                        | 'Userstory'
                        | 'MMVF'
                        | 'Stormee-normal'
                        | 'Stormee-Cra'
                    ) => setFormData(prev => ({ ...prev, mode: value }))}
                    required
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="CRA" className="text-white">
                        CRA
                      </SelectItem>
                      <SelectItem value="Userstory" className="text-white">
                        Userstory
                      </SelectItem>
                      <SelectItem value="MMVF" className="text-white">
                        MMVF
                      </SelectItem>
                      <SelectItem value="Stormee-normal" className="text-white">
                        Stormee (Normal)
                      </SelectItem>
                      <SelectItem value="Stormee-Cra" className="text-white">
                        Stormee (CRA)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Prompt Description - Free text only */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Prompt Description *</label>

                  <Textarea
                    value={formData.promptDescription}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        promptDescription: e.target.value,
                      }))
                    }
                    placeholder="Enter prompt description..."
                    required
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
            </div>
              
              {/* Prompt ID (auto-generated) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Prompt ID</label>
                <Input
                  value={formData.promptId}
                  onChange={(e) => setFormData(prev => ({ ...prev, promptId: e.target.value }))}
                  placeholder="Auto-generated from flow-title-mode-description"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              {/* Prompt Content */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Prompt Content *</label>
                <Textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter your prompt content..."
                  required
                  rows={8}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Author</label>
                  <Input
                    value={formData.metadata.author || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, author: e.target.value }
                      }))
                    }
                    placeholder="Author name"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Token Count</label>
                  <Input
                    type="number"
                    value={formData.metadata.tokens || 0}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        metadata: {
                          ...prev.metadata,
                          tokens: parseInt(e.target.value) || 0
                        }
                      }))
                    }
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Changelog</label>
                  <Input
                    value={formData.metadata.changelog || ''}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, changelog: e.target.value }
                      }))
                    }
                    placeholder="What changed in this version?"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Create New Version' : 'Create Prompt'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search prompts..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
            />
            
            <Select
              value={filters.flow || 'all_flows'}
              onValueChange={(value) =>
                setFilters(prev => ({ 
                  ...prev, 
                  flow: value === 'all_flows' ? undefined : value,
                  promptTitle: undefined,
                  promptDescription: undefined
                }))
              }
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="All flows" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all_flows" className="text-white">All flows</SelectItem>
                {availableFlows.map((flow) => (
                  <SelectItem key={flow} value={flow} className="text-white">
                    {flow.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.promptTitle || 'all_promptTitles'}
              onValueChange={(value) =>
                setFilters(prev => ({ 
                  ...prev, 
                  promptTitle: value === 'all_promptTitles' ? undefined : value,
                  promptDescription: undefined
                }))
              }
              disabled={!filters.flow}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="All prompt titles" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all_promptTitles" className="text-white">
                  All prompt titles
                </SelectItem>
                {filters.flow &&
                  getFeaturesByFlow(prompts, filters.flow).map((title) => (
                    <SelectItem key={title} value={title} className="text-white">
                      {title.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            <Select
              value={filters.mode || 'all_modes'}
              onValueChange={(value) =>
                setFilters(prev => ({ 
                  ...prev, 
                  mode:
                    value === 'all_modes'
                      ? undefined
                      : (value as
                          | 'CRA'
                          | 'Userstory'
                          | 'MMVF'
                          | 'Stormee-normal'
                          | 'Stormee-Cra')
                }))
              }
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="All modes" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all_modes" className="text-white">
                  All modes
                </SelectItem>
                <SelectItem value="CRA" className="text-white">
                  CRA
                </SelectItem>
                <SelectItem value="Userstory" className="text-white">
                  Userstory
                </SelectItem>
                <SelectItem value="MMVF" className="text-white">
                  MMVF
                </SelectItem>
                <SelectItem value="Stormee-normal" className="text-white">
                  Stormee (Normal)
                </SelectItem>
                <SelectItem value="Stormee-Cra" className="text-white">
                  Stormee (CRA)
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Filter by prompt description..."
              value={filters.promptDescription || ""}
              onChange={(e) =>
                setFilters(prev => ({
                  ...prev,
                  promptDescription: e.target.value
                }))
              }
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border-red-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-slate-400">Loading prompts...</p>
        </div>
      )}

      {/* Prompts List */}
      {!loading && (
        <div className="grid gap-6">
          {filteredPrompts.length === 0 ? (
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-400 text-lg">No prompts found</p>
                <p className="text-slate-500 text-sm">
                  {Object.keys(filters).some(
                    key => (filters as any)[key as keyof PromptFilterState]
                  )
                    ? 'Try adjusting your filters or create a new prompt'
                    : 'Create your first prompt to get started'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPrompts.map((prompt) => (
              <Card
                key={`${prompt.promptId}-${prompt.version}`}
                className="bg-slate-800/50 backdrop-blur-sm border-slate-700"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white">{prompt.promptId}</CardTitle>
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                          v{prompt.version}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${
                            prompt.mode === 'Stormee-normal' ||
                            prompt.mode === 'Stormee-Cra'
                              ? 'border-purple-500 text-purple-400'
                              : 'border-green-500 text-green-400'
                          }`}
                        >
                          {prompt.mode}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {prompt.flow}
                        </span>
                        <span>→</span>
                        <span>{prompt.promptTitle}</span>
                        <span>→</span>
                        <span>{prompt.promptDescription}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadVersions(prompt.promptId)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <History className="mr-1 h-3 w-3" />
                        Versions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(prompt)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(prompt.promptId, prompt.version)}
                        className="border-red-600 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Prompt Content:</h4>
                    <div className="bg-slate-900/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                        {prompt.prompt.length > 500 
                          ? `${prompt.prompt.substring(0, 500)}...`
                          : prompt.prompt
                        }
                      </pre>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {prompt.metadata.author && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <User className="h-3 w-3" />
                        <span>{prompt.metadata.author}</span>
                      </div>
                    )}
                    {prompt.metadata.tokens && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <FileText className="h-3 w-3" />
                        <span>{prompt.metadata.tokens} tokens</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{prompt.metadata.displayDate}</span>
                    </div>
                    {prompt.metadata.changelog && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <GitBranch className="h-3 w-3" />
                        <span className="truncate">{prompt.metadata.changelog}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Versions Modal */}
      {viewingVersions && (
        <Dialog open={!!viewingVersions} onOpenChange={() => setViewingVersions(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History: {viewingVersions}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {versions.map((version) => (
                <Card
                  key={`${version.promptId}-${version.version}`}
                  className="bg-slate-700/50"
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-600 text-white">
                          v{version.version}
                        </Badge>
                        <span className="text-sm text-slate-400">
                          {version.metadata.displayDate} {version.metadata.displayTime}
                        </span>
                        {version.metadata.author && (
                          <span className="text-sm text-slate-400">
                            by {version.metadata.author}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewingVersions(null);
                            handleEdit(version);
                          }}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Use as Template
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDelete(version.promptId, version.version)
                          }
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {version.metadata.changelog && (
                      <p className="text-sm text-slate-400 mb-2 italic">
                        Change: {version.metadata.changelog}
                      </p>
                    )}
                    <div className="bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                        {version.prompt}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
