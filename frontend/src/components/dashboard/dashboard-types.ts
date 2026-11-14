export type TabType = "projects" | "ideas" | "tasks" | "finances" | "messages" | "support" | "settings"

export interface ProjectFile {
  id: number
  project_id: number
  uploader_id: number
  file_name: string
  file_path: string
  file_size?: number
  created_at: string
}

export interface ProjectMilestone {
  id: number
  project_id: number
  step_number: number
  title: string
  amount: number
  status: "pending_funds" | "escrow_funded" | "in_review" | "approved" | "disputed"
  raw_report?: string | null
  ai_summary?: string | null
  paid_at?: string | null
  result_files?: any[]
  gost_structured_data?: any
  gost_docx_path?: string | null
  gost_pdf_path?: string | null
}

export interface Project {
  id: number
  title: string
  investor_id: number
  lab_id: number
  total_budget: number
  status: "draft" | "active" | "completed" | "disputed"
  created_at: string
  investor_name?: string
  lab_name?: string
  milestones: ProjectMilestone[]
  files?: ProjectFile[]
  is_syndicated?: boolean
  syndication_min_deposit?: number
  syndication_soft_cap?: number
  syndication_status?: "open" | "funded" | "closed"
  syndication_total_raised?: number
  syndicate_members_count?: number
}

export interface SyndicateMember {
  id: number
  project_id: number
  investor_id: number
  investor_name?: string
  organization_name?: string
  invested_amount: number
  share_percent: number
  is_lead: boolean
  ip_share_type: string
  joined_at: string
}

export interface SyndicateCapTable {
  project_id: number
  project_title: string
  total_budget: number
  soft_cap: number
  min_deposit: number
  total_raised: number
  progress_percent: number
  syndication_status: string
  is_lead: boolean
  current_user_share: number
  current_user_invested: number
  members: SyndicateMember[]
}

export interface IdeaItem {
  id: number
  author_id: number
  type: string
  title: string
  summary: string
  category: string
  trl_level: number
  budget_total: number
  milestones: { step: number; title: string; amount: number }[]
  file_hash: string
  moderation_status: "pending" | "approved" | "rejected"
  moderation_comment?: string | null
  created_at: string
  author_name?: string
  organization_name?: string
}

export interface TaskBid {
  id: number
  task_id: number
  lab_id: number
  proposed_budget: number
  proposed_deadline: string
  work_plan?: string | null
  attached_patents?: string[]
  is_accepted: boolean
  created_at: string
  lab_name?: string
  lab_org?: string
  chat_id?: number
}

export interface TaskMilestone {
  step: number
  title: string
  amount: number
}

export interface TaskItem {
  id: number
  creator_id: number
  investor_id?: number
  title: string
  description: string
  budget: number
  deadline: string
  milestones?: TaskMilestone[]
  status: "open" | "in_progress" | "completed"
  created_at: string
  creator_name?: string
  investor_name?: string
  creator_role?: string
  bids?: TaskBid[]
}

export interface TransactionItem {
  id: number
  from_user_id?: number | null
  to_user_id?: number | null
  project_id?: number | null
  amount: number
  type: "deposit" | "donation" | "escrow_lock" | "escrow_release" | "payout" | "platform_fee" | "refund"
  status?: "completed" | "pending" | "rejected"
  description: string
  bank_details?: any
  created_at: string
}

export interface ChatMemberItem {
  id: number
  chat_id: number
  user_id: number
  role: string
  full_name: string
  organization_name?: string | null
  user_role: string
  invested_amount?: number | null
  share_percent?: number | null
  joined_at: string
  is_online?: boolean
}

export interface ChatItem {
  id: number
  title: string
  chat_type?: "direct" | "project" | "support"
  investor_id?: number | null
  lab_id?: number | null
  project_id?: number | null
  context_type?: string | null
  context_id?: number | null
  other_party_id?: number | null
  other_party_name?: string
  other_party_role?: string
  unread_count: number
  last_message?: string | null
  members_count?: number
}

export interface MessageAttachmentItem {
  id: number
  message_id: number
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
}

export interface MessageItem {
  id: number
  chat_id: number
  sender_id: number
  content: string
  is_read: boolean
  is_system?: boolean
  created_at: string
  sender_name?: string
  sender_role?: string
  attachments?: MessageAttachmentItem[]
}

export interface PublicUserProfile {
  id: number
  full_name: string
  organization_name?: string | null
  role: "investor" | "lab"
  verification_status: "pending" | "verified" | "rejected"
  inn?: string | null
  ogrn?: string | null
  representative_name?: string | null
  bio?: string | null
  website_url?: string | null
  external_links: { title: string; url: string }[]
  portfolio_files: { id: string; name: string; url: string; size: number; uploaded_at: string }[]
  patents_info: PatentItem[]
  completed_projects_count: number
  active_projects_count: number
  ideas_count: number
  tasks_count: number
  created_at?: string
}

export interface MatchingInvitationItem {
  invitation_id: number
  task_id: number
  title: string
  description: string
  budget: number
  deadline: string
  investor_name: string
  similarity_score: number
  match_percent: number
  matched_reasons: string[]
  status: "pending" | "viewed" | "accepted" | "declined"
  created_at: string
}

export interface RecommendedLabItem {
  invitation_id: number
  lab_id: number
  organization_name: string
  representative_name?: string
  inn?: string
  verification_status: string
  bio?: string
  similarity_score: number
  match_percent: number
  matched_reasons: string[]
  status: string
  patents_count: number
}

export interface ProfitPreviewItem {
  investor_id: number
  investor_name: string
  organization_name?: string | null
  invested_amount: number
  share_percent: number
  payout_amount: number
}

export interface ProfitPreviewData {
  project_id: number
  project_title: string
  total_profit: number
  total_invested: number
  investors_count: number
  items: ProfitPreviewItem[]
}

export interface ProfitDistributionHistoryItem {
  id: number
  project_id: number
  initiator_id: number
  initiator_name?: string | null
  total_amount: number
  distribution_date: string
  description: string
  status: string
  items: {
    id: number
    investor_id: number
    investor_name: string
    organization_name?: string | null
    invested_amount: number
    share_percent: number
    payout_amount: number
    transaction_id?: number | null
  }[]
}

export interface TicketMessageItem {
  id: number
  ticket_id: number
  sender_id: number
  is_admin_reply: boolean
  content: string
  created_at: string
  sender_name?: string
}

export interface TicketItem {
  id: number
  user_id: number
  initiated_by_admin?: boolean
  category: string
  priority: string
  subject: string
  description: string
  status: "open" | "in_progress" | "resolved"
  admin_reply?: string | null
  created_at: string
  messages?: TicketMessageItem[]
}

export interface PatentItem {
  number: string
  title: string
  date: string
  attachment_name?: string
  stored_filename?: string
  file_url?: string
  file_size?: number
}

export interface DocumentItem {
  name: string
  type: string
  status: "verified" | "pending" | "rejected"
  date: string
  attachment_name?: string
  stored_filename?: string
  file_url?: string
  file_size?: number
}
