/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  initDatabase,
  getTasks,
  addTask,
  toggleTask,
  updateTask,
  deleteTask,
  addSubtask,
  toggleSubtask,
  updateSubtask,
  deleteSubtask,
  getNotes,
  addNote,
  updateNote,
  deleteNote,
  getDistinctTaskDates,
  getDatabaseStats,
  exportDatabaseFile,
  subscribeToDatabase,
  getCurrentUser,
  logoutUser,
} from './services/db';
import { Task, Note, DatabaseStats, Subtask, User } from './types';
import { Header } from './components/Header';
import { TaskInput } from './components/TaskInput';
import { TaskList } from './components/TaskList';
import { NotesSection } from './components/NotesSection';
import { AuthScreen } from './components/AuthScreen';
import { Loader2, CheckSquare, AlertCircle, Download } from 'lucide-react';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [stats, setStats] = useState<DatabaseStats>({
    taskCount: 0,
    completedTaskCount: 0,
    subtaskCount: 0,
    noteCount: 0,
    distinctDaysCount: 0,
    dbSizeBytes: 0,
  });

  // Refresh all state from the local database for the current logged-in user
  const refreshFromDb = useCallback(() => {
    if (!isDbReady || !currentUser) return;
    try {
      const loadedTasks = getTasks(selectedDate, currentUser.id);
      const loadedNotes = getNotes(currentUser.id);
      const distinctDates = getDistinctTaskDates(currentUser.id);
      const currentStats = getDatabaseStats(currentUser.id);

      setTasks(loadedTasks);
      setNotes(loadedNotes);
      setAvailableDates(distinctDates);
      setStats(currentStats);
    } catch (err: any) {
      console.error('Error refreshing from database:', err);
    }
  }, [isDbReady, selectedDate, currentUser]);

  // Initialize database once on mount and check for logged-in user
  useEffect(() => {
    let isMounted = true;
    async function bootstrap() {
      try {
        await initDatabase();
        if (isMounted) {
          setIsDbReady(true);
          const savedUser = getCurrentUser();
          if (savedUser) {
            setCurrentUser(savedUser);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize database:', err);
        if (isMounted) {
          setInitError(err.message || 'Failed to initialize database engine');
        }
      }
    }
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to database changes and refresh
  useEffect(() => {
    if (!isDbReady || !currentUser) return;
    refreshFromDb();
    const unsubscribe = subscribeToDatabase(() => {
      refreshFromDb();
    });
    return () => unsubscribe();
  }, [isDbReady, currentUser, refreshFromDb]);

  // Auth actions
  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setTasks([]);
    setNotes([]);
    setAvailableDates([]);
    setStats({
      taskCount: 0,
      completedTaskCount: 0,
      subtaskCount: 0,
      noteCount: 0,
      distinctDaysCount: 0,
      dbSizeBytes: 0,
    });
  };

  // Task actions
  const handleAddTask = async (
    text: string,
    date: string,
    priority: 'low' | 'medium' | 'high',
    subtasks: string[]
  ) => {
    if (!currentUser) return;
    await addTask(text, date, priority, subtasks, currentUser.id);
    refreshFromDb();
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    await toggleTask(id, completed);
    refreshFromDb();
  };

  const handleUpdateTask = async (
    id: string,
    newText: string,
    priority?: 'low' | 'medium' | 'high'
  ) => {
    await updateTask(id, newText, priority);
    refreshFromDb();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    refreshFromDb();
  };

  // Subtask actions
  const handleAddSubtask = async (taskId: string, text: string): Promise<Subtask> => {
    const st = await addSubtask(taskId, text);
    refreshFromDb();
    return st;
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    await toggleSubtask(subtaskId, completed);
    refreshFromDb();
  };

  const handleUpdateSubtask = async (subtaskId: string, text: string) => {
    await updateSubtask(subtaskId, text);
    refreshFromDb();
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await deleteSubtask(subtaskId);
    refreshFromDb();
  };

  // Note actions
  const handleAddNote = async (title: string, body: string, category?: string) => {
    if (!currentUser) return;
    await addNote(title, body, category, currentUser.id);
    refreshFromDb();
  };

  const handleUpdateNote = async (
    id: string,
    title: string,
    body: string,
    category?: string
  ) => {
    await updateNote(id, title, body, category);
    refreshFromDb();
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    refreshFromDb();
  };

  // Loading screen while storage engine loads
  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        {initError ? (
          <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Database Error</h2>
            <p className="text-xs text-rose-600 mt-2 bg-rose-50 p-2.5 rounded-lg font-mono text-left overflow-x-auto">
              {initError}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-sm animate-pulse">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Loading your workspace...</h2>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Restoring your tasks & notes</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // If not logged in, render the Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      {/* Top Header with User Info and Logout */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'tasks' ? (
          <div>
            {/* Task Input Section */}
            <TaskInput onAddTask={handleAddTask} selectedDate={selectedDate} />

            {/* Task List Section */}
            <TaskList
              tasks={tasks}
              availableDates={availableDates}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              onToggleTask={handleToggleTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onUpdateSubtask={handleUpdateSubtask}
              onDeleteSubtask={handleDeleteSubtask}
            />
          </div>
        ) : (
          /* Notes Section */
          <NotesSection
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
          />
        )}
      </main>

      {/* Clean Production Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-4 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-800">My Todo List</span>
            <span className="text-slate-300">•</span>
            <span>Logged in as {currentUser.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => exportDatabaseFile()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer font-medium"
              title="Download a backup file of all your tasks and notes"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup Data</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
