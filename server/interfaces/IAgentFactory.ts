export interface AgentDefinition {
  id: string;
  name: string;
  industry: string;
  systemPrompt: string;
  tools: string[];   // Tool IDs this agent is allowed to use
  personality: {
    tone: string;
    language: string;
    greeting: string;
  };
}

export interface IAgentFactory {
  load(agentId: string): AgentDefinition;
}
