import type { OnboardingStep, Session, User } from '@/shared/types';

/**
 * Mock users for development
 */
export const mockUsers: User[] = [
  { id: '1', name: 'Анна Смирнова', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'Иван Петров', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'Мария Кузнецова', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'Дмитрий Новиков', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: '5', name: 'Елена Волкова', avatar: 'https://i.pravatar.cc/150?img=5' },
];

/**
 * Mock onboarding steps
 */
export const onboardingSteps: OnboardingStep[] = [
  {
    id: '1',
    icon: '📝',
    title: 'Планируй',
    description: 'Составляйте списки задач на сессию, чтобы ничего не упустить',
    gradient: 'linear-gradient(to right, rgb(195 227 249), rgb(220 237 255))',
  },
  {
    id: '2',
    icon: '🎯',
    title: 'Фокусируйся',
    description: 'Работайте в тишине или в группе без отвлекающих факторов',
    gradient: 'linear-gradient(to right, rgb(220 211 244), rgb(236 229 251))',
  },
  {
    id: '3',
    icon: '🏆',
    title: 'Достигай',
    description: 'Отслеживайте свой прогресс и соревнуйтесь с друзьями',
    gradient: 'linear-gradient(to right, rgb(255 209 215), rgb(253, 222, 201))',
  },
];

/**
 * Mock active sessions for development
 */
export const mockSessions: Session[] = [
  {
    id: '1',
    name: 'Готовимся к коллоквиуму',
    isPrivate: false,
    participants: [mockUsers[0], mockUsers[1], mockUsers[2]],
    maxParticipants: 8,
    focusDuration: 25,
    breakDuration: 5,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Изучаем React и TypeScript',
    isPrivate: false,
    participants: [mockUsers[3], mockUsers[4]],
    maxParticipants: 6,
    focusDuration: 25,
    breakDuration: 5,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Работа над курсовым проектом',
    isPrivate: false,
    participants: [mockUsers[0], mockUsers[2], mockUsers[3], mockUsers[4]],
    maxParticipants: 10,
    focusDuration: 25,
    breakDuration: 5,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];
