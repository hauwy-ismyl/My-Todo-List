/**
 * Data types for My Todo List application
 * Simple, beginner-friendly structures for tasks, subtasks, and notes.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  userId?: string;
  text: string;
  completed: boolean;
  createdAt: string;
  /**
   * The date string formatted as YYYY-MM-DD
   * Allows organizing and viewing tasks by day (Today, Yesterday, or past days).
   */
  date: string;
  priority: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
}

export interface Note {
  id: string;
  userId?: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
}

export interface SqlLog {
  id: string;
  query: string;
  params?: any[];
  timestamp: string;
}

export interface DatabaseStats {
  taskCount: number;
  completedTaskCount: number;
  subtaskCount: number;
  noteCount: number;
  distinctDaysCount: number;
  dbSizeBytes: number;
}
