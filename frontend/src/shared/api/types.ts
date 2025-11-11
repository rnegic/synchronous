/**
 * API Type Definitions
 * Based on Swagger API documentation
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  error: string;
  code: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

export interface UserStats {
  totalSessions: number;
  totalFocusTime: number;
  currentStreak: number;
}

export interface UserProfile extends User {
  stats: UserStats;
}

export interface Contact {
  id: string;
  name: string;
  avatarUrl: string;
  isRegistered: boolean;
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionMode = 'solo' | 'group';
export type SessionStatus = 'pending' | 'active' | 'completed';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface SessionParticipant {
  userId: string;
  userName: string;
  avatarUrl: string;
  isReady: boolean;
  joinedAt: string;
}

export interface Session {
  id: string;
  mode: SessionMode;
  status: SessionStatus;
  tasks: Task[];
  focusDuration: number;
  breakDuration: number;
  groupName?: string;
  isPrivate: boolean;
  creatorId: string;
  startedAt: string | null;
  completedAt: string | null;
  participants: SessionParticipant[];
  inviteLink?: string;
  createdAt: string;
}

export interface SessionReport {
  sessionId: string;
  tasksCompleted: number;
  tasksTotal: number;
  focusTime: number;
  breakTime: number;
  cyclesCompleted: number;
  participants: ParticipantReport[];
  completedAt: string;
}

export interface ParticipantReport {
  userId: string;
  userName: string;
  avatarUrl: string;
  tasksCompleted: number;
  focusTime: number;
}

export interface ChatInfo {
  chatId: number;
  chatLink: string;
  title: string;
  participantsCount: number;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string;
  tasksCompleted: number;
  focusTime: number;
  score: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Login request with MAX initData
 * initData is provided by MAX Bridge and contains validated user info
 */
export interface LoginRequest {
  initData: string; // MAX Bridge initData string for validation
  deviceId: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateSessionRequest {
  mode: SessionMode;
  tasks: string[];
  focusDuration: number;
  breakDuration: number;
  groupName?: string;
  isPrivate: boolean;
}

export interface UpdateReadyRequest {
  isReady: boolean;
}

export interface UpdateTaskRequest {
  completed: boolean;
}

export interface AddTaskRequest {
  title: string;
}

export interface SendMessageRequest {
  text: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Login response
 */
export interface LoginResponse {
  user: User;
}

/**
 * Refresh token response 
 */
export interface RefreshTokenResponse {
  success: boolean;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
  stats: UserStats;
}

export interface ContactsResponse {
  contacts: Contact[];
}

export interface SessionResponse {
  session: Session;
}

export interface SessionsHistoryResponse {
  sessions: Session[];
  pagination: PaginationMeta;
}

export interface SessionStartResponse {
  session: {
    id: string;
    status: string;
    startedAt: string;
  };
}

export interface SessionReportResponse {
  report: SessionReport;
}

export interface TaskResponse {
  task: Task;
}

export interface MessagesResponse {
  messages: Message[];
}

export interface MessageResponse {
  message: Message;
}

export interface ChatInfoResponse {
  chatId: number;
  chatLink: string;
  title: string;
  participantsCount: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}
