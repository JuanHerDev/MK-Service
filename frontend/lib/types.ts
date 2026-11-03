export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Organization = {
  organization_id: number;
  name: string;
  default_language: string;
  is_active: boolean;
  created_at: string;
};

export type Membership = {
  organization_id: number;
  role_code: string;
  role_name: string;
};

export type Me = {
  user_id: number;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  organization: Organization | null;
  membership: Membership | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
};

export type Target = {
  target_id: number;
  organization_id: number;
  name: string;
  description: string | null;
  mode: "basic" | "complete" | string;
  chat_endpoint: string;
  upload_endpoint: string | null;
  auth_type: string;
  rate_limit_rpm: number | null;
  headers_extra?: Record<string, string> | null;
  model?: string | null;
  connection_status: string;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TargetCreate = {
  name: string;
  description?: string | null;
  mode: "basic" | "complete";
  chat_endpoint: string;
  upload_endpoint?: string | null;
  auth_type: "bearer" | "api_key" | "none";
  auth_value?: string | null;
  rate_limit_rpm?: number | null;
  /** OpenAI-compatible model id; sent as headers_extra.model */
  model?: string | null;
  headers_extra?: Record<string, string> | null;
};

export type CampaignStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type Campaign = {
  campaign_id: number;
  organization_id: number;
  target_id: number;
  name: string;
  mode: string;
  status: CampaignStatus | string;
  scope_prompt_injection: boolean;
  scope_data_leakage: boolean;
  progress_percent: number;
  scheduled_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  parent_campaign_id: number | null;
  created_by: number;
  created_at: string;
};

export type CampaignCreate = {
  name: string;
  target_id: number;
  scope_prompt_injection: boolean;
  scope_data_leakage: boolean;
  document_ids: number[];
  run_now: boolean;
};

export type CampaignDocumentBrief = {
  attack_document_id: number;
  name: string;
  technique?: string | null;
  category?: string | null;
  scope?: string | null;
};

export type CampaignRef = {
  campaign_id: number;
  name: string;
  status: string;
  created_at?: string | null;
};

export type CampaignDetail = Campaign & {
  target_name?: string | null;
  created_by_email?: string | null;
  created_by_name?: string | null;
  document_ids?: number[];
  documents?: CampaignDocumentBrief[];
  findings_count?: number;
  parent?: CampaignRef | null;
  children?: CampaignRef[];
  config?: Record<string, unknown> | null;
};

export type Severity = "low" | "medium" | "high" | "critical";

export type FindingStatus = "open" | "in_progress" | "resolved" | "false_positive" | "accepted_risk";

export type Finding = {
  finding_id: number;
  campaign_id: number;
  title: string;
  description: string | null;
  recommendation: string | null;
  severity: Severity | string;
  status: FindingStatus | string;
  category: string;
  priority_order: number;
  canary_found: boolean;
  query_used: string | null;
  response_excerpt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FindingComment = {
  comment_id: number;
  finding_id: number;
  user_id: number;
  message: string;
  created_at: string;
};

export type Report = {
  report_id: number;
  campaign_id: number;
  report_type: string;
  language: string;
  report_status: string;
  file_path: string | null;
  size_bytes: number | null;
  generated_by: number | null;
  generated_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type AttackDocument = {
  attack_document_id: number;
  organization_id: number | null;
  name: string;
  description: string | null;
  technique: string | null;
  category: string;
  scope: string;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  doc_version: string | null;
  is_active: boolean;
  created_at: string;
};
