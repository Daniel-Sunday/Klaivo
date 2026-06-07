export interface Session {
  id: string;
  topic: string;
  mode: 'understand' | 'write' | 'prepare' | 'revise';
  level?: string;
  result_json: Record<string, any>;
  is_shared?: boolean;
  [key: string]: any;
}
export interface FollowUp {
  question: string;
  answer: string;
  created_at: string;
  user_id?: string;
}
