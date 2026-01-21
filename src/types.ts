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

export interface ChatState {
  answers: Record<string, any>;
  currentStep: string;
}

export interface StorageAdapter {
  save: (userId: string, data: any) => Promise<void>;
}