export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  name: string;
  isPrivate: boolean;
  participants: User[];
  maxParticipants: number;
  focusDuration: number; //  minutes
  breakDuration: number; // minutes
  status: 'waiting' | 'active' | 'break' | 'completed';
  createdAt: string;
  startedAt?: string;
  tasks?: Task[];
}

export interface OnboardingStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

export type SessionMode = 'solo' | 'group';

export interface SessionSettings {
  mode: SessionMode;
  tasks: string[];
  groupName?: string;
  isPrivate?: boolean;
  focusDuration?: number;
  breakDuration?: number;
}
