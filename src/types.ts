export interface ChatNode {
  id: string;
  question: string;
  type?: 'button' | 'input';
  options?: string[];
  next: string | ((answer: any) => string);
  isEnd?: boolean;
}

export interface ChatMessage {
  nodeId: string;
  question: string;
  answer: any;
  timestamp: number;
}

export interface ChatOptions {
  saveStrategy?: 'always' | 'onEnd';
  scenarioId?: string;
}

export interface ChatState {
  answers: Record<string, any>;
  currentStep: string;
  messages: ChatMessage[];
  flowHash: string;
  updatedAt: number;
}

export interface StorageAdapter {
  saveState: (userId: string, state: ChatState) => Promise<void>;
  loadState: (userId: string) => Promise<ChatState | null>;
}