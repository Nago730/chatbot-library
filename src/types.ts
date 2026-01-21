export interface ChatNode {
  id: string;
  question: string;
  options?: string[];
  next: string | ((answer: any) => string);
  isEnd?: boolean;
}

export interface ChatState {
  answers: Record<string, any>;
  currentStep: string;
}

export interface StorageAdapter {
  save: (userId: string, data: any) => Promise<void>;
}