export interface ScriptConfig {
  accountId: string;
  apiToken: string;
  username: string;
  modelId?: string;
}

export interface SavedUser {
  id: string;
  accountId: string;
  apiToken: string;
  username: string;
  time: string;
  modelId?: string;
}
