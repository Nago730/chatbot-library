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
  /**
   * 세션 ID 설정
   * - 'auto': 마지막 세션 복구 또는 새 세션 생성 (기본값)
   * - 'new': 항상 새로운 세션 생성
   * - string: 특정 세션 ID로 복구 또는 생성
   */
  sessionId?: 'auto' | 'new' | string;
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