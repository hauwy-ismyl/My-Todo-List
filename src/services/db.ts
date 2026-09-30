/**
 * SQLite Database Service for My Todo List
 *
 * This file manages the SQLite database using WebAssembly (sql.js).
 * It runs genuine SQLite in your browser, and saves the binary database file
 * into IndexedDB so all your tasks, subtasks, notes, and previous days' tasks
 * stay safe even when you refresh the browser!
 */

import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { Database } from 'sql.js';
import { Task, Subtask, Note, SqlLog, DatabaseStats, User } from '../types';

const DB_STORAGE_KEY = 'my_todo_sqlite_file_v1';
const DB_NAME = 'TodoAppSQLiteDB';
const DB_STORE_NAME = 'sqlite_storage';

let dbInstance: Database | null = null;
let sqlLogs: SqlLog[] = [];
const listeners: Array<() => void> = [];

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeToDatabase(listener: () => void) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function getRecentSqlLogs(): SqlLog[] {
  return [...sqlLogs];
}

function logQuery(query: string, params?: any[]) {
  const log: SqlLog = {
    id: Math.random().toString(36).substring(2, 9),
    query: query.trim(),
    params,
    timestamp: new Date().toLocaleTimeString(),
  };
  sqlLogs = [log, ...sqlLogs.slice(0, 49)]; // Keep the 50 most recent queries for learning
  notifyListeners();
}

/**
 * IndexedDB helpers to store and load the raw SQLite binary data.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const idb = request.result;
      if (!idb.objectStoreNames.contains(DB_STORE_NAME)) {
        idb.createObjectStore(DB_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadSavedDatabaseBinary(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(DB_STORE_NAME, 'readonly');
      const store = tx.objectStore(DB_STORE_NAME);
      const req = store.get(DB_STORAGE_KEY);
      req.onsuccess = () => {
        if (req.result && req.result instanceof Uint8Array) {
          resolve(req.result);
        } else {
          // Check localStorage as fallback
          const b64 = localStorage.getItem(DB_STORAGE_KEY);
          if (b64) {
            const binaryString = atob(b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            resolve(bytes);
          } else {
            resolve(null);
          }
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, trying localStorage fallback', err);
    try {
      const b64 = localStorage.getItem(DB_STORAGE_KEY);
      if (b64) {
        const binaryString = atob(b64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

async function persistDatabaseBinary(bytes: Uint8Array): Promise<void> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(DB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DB_STORE_NAME);
    store.put(bytes, DB_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to persist to IndexedDB, fallback to localStorage', err);
    try {
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      localStorage.setItem(DB_STORAGE_KEY, btoa(binaryString));
    } catch {
      // ignore
    }
  }
}

/**
 * Initializes the SQLite Database via sql.js (WebAssembly).
 */
export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  logQuery('-- Initializing SQLite Database Engine --');

  // Load the SQLite engine (self-contained, no external WASM fetch errors)
  const SQL = await initSqlJs();

  const savedData = await loadSavedDatabaseBinary();

  if (savedData && savedData.length > 0) {
    dbInstance = new SQL.Database(savedData);
    logQuery('-- Loaded existing SQLite database from storage (' + savedData.length + ' bytes) --');
  } else {
    dbInstance = new SQL.Database();
    logQuery('-- Created brand new SQLite database in memory --');
  }

  // Create tables if they do not already exist
  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'demo_user',
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      date TEXT NOT NULL,
      priority TEXT DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'demo_user',
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      category TEXT DEFAULT 'general'
    );
  `;

  dbInstance.run(createTablesSql);
  logQuery(createTablesSql);

  // Migration: Ensure user_id column exists on tasks and notes if upgraded from older schema
  try {
    const taskCols = dbInstance.exec("PRAGMA table_info(tasks)");
    const colNames = (taskCols[0]?.values.map((v: any[]) => v[1]) || []) as string[];
    if (!colNames.includes('user_id')) {
      dbInstance.run("ALTER TABLE tasks ADD COLUMN user_id TEXT DEFAULT 'demo_user'");
    }
  } catch {
    // ignore
  }

  try {
    const noteCols = dbInstance.exec("PRAGMA table_info(notes)");
    const noteColNames = (noteCols[0]?.values.map((v: any[]) => v[1]) || []) as string[];
    if (!noteColNames.includes('user_id')) {
      dbInstance.run("ALTER TABLE notes ADD COLUMN user_id TEXT DEFAULT 'demo_user'");
    }
  } catch {
    // ignore
  }

  // Ensure default Demo User exists
  const demoStmt = dbInstance.prepare("SELECT COUNT(*) as count FROM users WHERE id = 'demo_user'");
  let hasDemoUser = false;
  if (demoStmt.step()) {
    hasDemoUser = ((demoStmt.getAsObject().count as number) || 0) > 0;
  }
  demoStmt.free();

  if (!hasDemoUser) {
    // SHA-256 for 'password123'
    dbInstance.run(
      `INSERT OR IGNORE INTO users (id, name, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'demo_user',
        'Demo User',
        'demo@example.com',
        'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
        new Date().toISOString(),
      ]
    );
  }

  // If new database, seed friendly beginner sample data
  const checkStmt = dbInstance.prepare('SELECT COUNT(*) as count FROM tasks');
  let rowCount = 0;
  if (checkStmt.step()) {
    rowCount = (checkStmt.getAsObject().count as number) || 0;
  }
  checkStmt.free();

  if (rowCount === 0) {
    seedInitialData(dbInstance);
  }

  await saveDatabase();
  notifyListeners();
  return dbInstance;
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seedInitialData(db: Database) {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  // Task 1: Today
  const task1Id = 't_welcome_1';
  db.run(
    `INSERT INTO tasks (id, user_id, text, completed, created_at, date, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [task1Id, 'demo_user', 'Welcome to My Todo List! Here are a few tips to get started', 0, new Date().toISOString(), today, 'high']
  );
  db.run(
    `INSERT INTO subtasks (id, task_id, text, completed, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['st_1', task1Id, 'Check off completed tasks using the checkbox on the left', 1, new Date().toISOString()]
  );
  db.run(
    `INSERT INTO subtasks (id, task_id, text, completed, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['st_2', task1Id, 'Click "Add subtask" to break big goals into smaller steps', 0, new Date().toISOString()]
  );
  db.run(
    `INSERT INTO subtasks (id, task_id, text, completed, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['st_3', task1Id, 'Use the date tabs above to browse Today, Yesterday, or past days', 0, new Date().toISOString()]
  );

  // Task 2: Yesterday
  const task2Id = 't_yesterday_1';
  db.run(
    `INSERT INTO tasks (id, user_id, text, completed, created_at, date, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [task2Id, 'demo_user', 'Prepare weekly goals and priorities', 1, new Date(Date.now() - 86400000).toISOString(), yesterday, 'medium']
  );
  db.run(
    `INSERT INTO subtasks (id, task_id, text, completed, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['st_prev_1', task2Id, 'Review calendar and upcoming deadlines', 1, new Date(Date.now() - 86400000).toISOString()]
  );

  // Task 3: Another task for today
  db.run(
    `INSERT INTO tasks (id, user_id, text, completed, created_at, date, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['t_today_2', 'demo_user', 'Jot down ideas or reminders in the Notes tab', 0, new Date().toISOString(), today, 'low']
  );

  // Note 1: Welcome Note
  db.run(
    `INSERT INTO notes (id, user_id, title, body, created_at, updated_at, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'n_welcome_1',
      'demo_user',
      'Welcome to Your Personal Workspace',
      'Use this space to store quick reminders, meeting notes, project plans, and daily reflections. Everything you write is automatically saved to your device and stays preserved whenever you return.',
      new Date().toISOString(),
      new Date().toISOString(),
      'Personal',
    ]
  );

  logQuery('-- Seeded initial sample tasks and notes for learning --');
}

/**
 * Authentication Methods
 */
export async function registerUser(name: string, email: string, password: string): Promise<User> {
  if (!dbInstance) throw new Error('Database not initialized');
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Name is required');
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Valid email address is required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  // Check if email already exists
  const checkStmt = dbInstance.prepare('SELECT id FROM users WHERE LOWER(email) = ?');
  checkStmt.bind([cleanEmail]);
  if (checkStmt.step()) {
    checkStmt.free();
    throw new Error('An account with this email already exists');
  }
  checkStmt.free();

  const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const passwordHash = await hashPassword(password);
  const createdAt = new Date().toISOString();

  dbInstance.run(
    'INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, cleanName, cleanEmail, passwordHash, createdAt]
  );

  // Seed welcome task and note for the new user!
  const today = getTodayDateString();
  const welcomeTaskId = 't_welcome_' + Date.now();
  dbInstance.run(
    'INSERT INTO tasks (id, user_id, text, completed, created_at, date, priority) VALUES (?, ?, ?, 0, ?, ?, ?)',
    [welcomeTaskId, userId, `Welcome ${cleanName}! Here is your first task`, createdAt, today, 'high']
  );
  dbInstance.run(
    'INSERT INTO subtasks (id, task_id, text, completed, created_at) VALUES (?, ?, ?, 0, ?)',
    ['st_' + Date.now(), welcomeTaskId, 'Check off this task or add your own!', createdAt]
  );
  dbInstance.run(
    'INSERT INTO notes (id, user_id, title, body, created_at, updated_at, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['n_' + Date.now(), userId, 'My First Note', 'You can write anything here: project outlines, ideas, or reminders.', createdAt, createdAt, 'Personal']
  );

  await saveDatabase();
  notifyListeners();

  const user: User = {
    id: userId,
    name: cleanName,
    email: cleanEmail,
    createdAt,
  };
  saveAuthSession(user);
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  if (!dbInstance) throw new Error('Database not initialized');
  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const stmt = dbInstance.prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = ?');
  stmt.bind([cleanEmail]);

  if (!stmt.step()) {
    stmt.free();
    throw new Error('No account found with this email');
  }

  const row = stmt.getAsObject();
  stmt.free();

  if (row.password_hash !== passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  const user: User = {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    createdAt: row.created_at as string,
  };
  saveAuthSession(user);
  return user;
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem('my_todo_auth_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveAuthSession(user: User): void {
  try {
    localStorage.setItem('my_todo_auth_user', JSON.stringify(user));
  } catch {
    // ignore
  }
  notifyListeners();
}

export function logoutUser(): void {
  try {
    localStorage.removeItem('my_todo_auth_user');
  } catch {
    // ignore
  }
  notifyListeners();
}

export function getUserById(id: string): User | null {
  if (!dbInstance) return null;
  const stmt = dbInstance.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      createdAt: row.created_at as string,
    };
  }
  stmt.free();
  return null;
}

/**
 * Persists the SQLite database to IndexedDB.
 */
export async function saveDatabase(): Promise<void> {
  if (!dbInstance) return;
  const binary = dbInstance.export();
  await persistDatabaseBinary(binary);
}

/**
 * Fetch all tasks, optionally filtered by a specific date and user.
 */
export function getTasks(dateFilter?: string, userId?: string): Task[] {
  if (!dbInstance) return [];

  let query = 'SELECT id, user_id, text, completed, created_at, date, priority FROM tasks';
  const conditions: string[] = [];
  const params: any[] = [];

  if (userId) {
    conditions.push('(user_id = ? OR (user_id IS NULL AND ? = "demo_user"))');
    params.push(userId, userId);
  }

  if (dateFilter && dateFilter !== 'all') {
    conditions.push('date = ?');
    params.push(dateFilter);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  const stmt = dbInstance.prepare(query);
  if (params.length > 0) stmt.bind(params);

  const tasks: Task[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    tasks.push({
      id: row.id as string,
      userId: (row.user_id as string) || 'demo_user',
      text: row.text as string,
      completed: Boolean(row.completed),
      createdAt: row.created_at as string,
      date: row.date as string,
      priority: (row.priority as 'low' | 'medium' | 'high') || 'medium',
      subtasks: [],
    });
  }
  stmt.free();

  // Load subtasks for each task
  const subtasksStmt = dbInstance.prepare(
    'SELECT id, task_id, text, completed, created_at FROM subtasks ORDER BY created_at ASC'
  );
  const subtasksByTaskId: Record<string, Subtask[]> = {};
  while (subtasksStmt.step()) {
    const row = subtasksStmt.getAsObject();
    const taskId = row.task_id as string;
    if (!subtasksByTaskId[taskId]) {
      subtasksByTaskId[taskId] = [];
    }
    subtasksByTaskId[taskId].push({
      id: row.id as string,
      taskId: taskId,
      text: row.text as string,
      completed: Boolean(row.completed),
      createdAt: row.created_at as string,
    });
  }
  subtasksStmt.free();

  tasks.forEach((t) => {
    t.subtasks = subtasksByTaskId[t.id] || [];
  });

  return tasks;
}

/**
 * Add a new task with optional subtasks.
 */
export async function addTask(
  text: string,
  date: string = getTodayDateString(),
  priority: 'low' | 'medium' | 'high' = 'medium',
  initialSubtasks: string[] = [],
  userId: string = 'demo_user'
): Promise<Task> {
  if (!dbInstance) throw new Error('Database not initialized');

  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();

  const sql = `INSERT INTO tasks (id, user_id, text, completed, created_at, date, priority) VALUES (?, ?, ?, 0, ?, ?, ?)`;
  const params = [taskId, userId, text.trim(), createdAt, date, priority];

  dbInstance.run(sql, params);
  logQuery(sql, params);

  const createdSubtasks: Subtask[] = [];
  for (const stText of initialSubtasks) {
    if (stText.trim()) {
      const stId = 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const stSql = `INSERT INTO subtasks (id, task_id, text, completed, created_at) VALUES (?, ?, ?, 0, ?)`;
      const stParams = [stId, taskId, stText.trim(), new Date().toISOString()];
      dbInstance.run(stSql, stParams);
      logQuery(stSql, stParams);
      createdSubtasks.push({
        id: stId,
        taskId,
        text: stText.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await saveDatabase();
  notifyListeners();

  return {
    id: taskId,
    userId,
    text: text.trim(),
    completed: false,
    createdAt,
    date,
    priority,
    subtasks: createdSubtasks,
  };
}

/**
 * Toggle task completed status.
 */
export async function toggleTask(id: string, completed: boolean): Promise<void> {
  if (!dbInstance) return;
  const sql = 'UPDATE tasks SET completed = ? WHERE id = ?';
  const params = [completed ? 1 : 0, id];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

/**
 * Edit task text.
 */
export async function updateTask(id: string, newText: string, priority?: 'low' | 'medium' | 'high'): Promise<void> {
  if (!dbInstance) return;
  let sql = 'UPDATE tasks SET text = ?';
  const params: any[] = [newText.trim()];
  if (priority) {
    sql += ', priority = ?';
    params.push(priority);
  }
  sql += ' WHERE id = ?';
  params.push(id);

  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

/**
 * Delete a task and its associated subtasks.
 */
export async function deleteTask(id: string): Promise<void> {
  if (!dbInstance) return;
  // Delete subtasks first
  const delSubtasksSql = 'DELETE FROM subtasks WHERE task_id = ?';
  dbInstance.run(delSubtasksSql, [id]);
  logQuery(delSubtasksSql, [id]);

  // Delete task
  const delTaskSql = 'DELETE FROM tasks WHERE id = ?';
  dbInstance.run(delTaskSql, [id]);
  logQuery(delTaskSql, [id]);

  await saveDatabase();
  notifyListeners();
}

/**
 * Subtasks management
 */
export async function addSubtask(taskId: string, text: string): Promise<Subtask> {
  if (!dbInstance) throw new Error('Database not initialized');
  const stId = 'st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();
  const sql = 'INSERT INTO subtasks (id, task_id, text, completed, created_at) VALUES (?, ?, ?, 0, ?)';
  const params = [stId, taskId, text.trim(), createdAt];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();

  return {
    id: stId,
    taskId,
    text: text.trim(),
    completed: false,
    createdAt,
  };
}

export async function toggleSubtask(subtaskId: string, completed: boolean): Promise<void> {
  if (!dbInstance) return;
  const sql = 'UPDATE subtasks SET completed = ? WHERE id = ?';
  const params = [completed ? 1 : 0, subtaskId];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

export async function updateSubtask(subtaskId: string, newText: string): Promise<void> {
  if (!dbInstance) return;
  const sql = 'UPDATE subtasks SET text = ? WHERE id = ?';
  const params = [newText.trim(), subtaskId];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  if (!dbInstance) return;
  const sql = 'DELETE FROM subtasks WHERE id = ?';
  const params = [subtaskId];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

/**
 * Notes Management
 */
export function getNotes(userId?: string): Note[] {
  if (!dbInstance) return [];
  let query = 'SELECT id, user_id, title, body, created_at, updated_at, category FROM notes';
  const params: any[] = [];
  if (userId) {
    query += ' WHERE (user_id = ? OR (user_id IS NULL AND ? = "demo_user"))';
    params.push(userId, userId);
  }
  query += ' ORDER BY updated_at DESC';

  const stmt = dbInstance.prepare(query);
  if (params.length > 0) stmt.bind(params);

  const notes: Note[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    notes.push({
      id: row.id as string,
      userId: (row.user_id as string) || 'demo_user',
      title: row.title as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      category: (row.category as string) || 'general',
    });
  }
  stmt.free();
  return notes;
}

export async function addNote(
  title: string,
  body: string,
  category: string = 'general',
  userId: string = 'demo_user'
): Promise<Note> {
  if (!dbInstance) throw new Error('Database not initialized');
  const id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const sql = 'INSERT INTO notes (id, user_id, title, body, created_at, updated_at, category) VALUES (?, ?, ?, ?, ?, ?, ?)';
  const params = [id, userId, title.trim(), body.trim(), now, now, category];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();

  return {
    id,
    userId,
    title: title.trim(),
    body: body.trim(),
    createdAt: now,
    updatedAt: now,
    category,
  };
}

export async function updateNote(id: string, title: string, body: string, category?: string): Promise<void> {
  if (!dbInstance) return;
  const now = new Date().toISOString();
  let sql = 'UPDATE notes SET title = ?, body = ?, updated_at = ?';
  const params: any[] = [title.trim(), body.trim(), now];
  if (category) {
    sql += ', category = ?';
    params.push(category);
  }
  sql += ' WHERE id = ?';
  params.push(id);

  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

export async function deleteNote(id: string): Promise<void> {
  if (!dbInstance) return;
  const sql = 'DELETE FROM notes WHERE id = ?';
  const params = [id];
  dbInstance.run(sql, params);
  logQuery(sql, params);
  await saveDatabase();
  notifyListeners();
}

/**
 * Returns distinct dates that have tasks, sorted latest first.
 * Helps the user quickly filter and browse previous days' tasks.
 */
export function getDistinctTaskDates(userId?: string): string[] {
  if (!dbInstance) return [];
  let query = 'SELECT DISTINCT date FROM tasks';
  const params: any[] = [];
  if (userId) {
    query += ' WHERE (user_id = ? OR (user_id IS NULL AND ? = "demo_user"))';
    params.push(userId, userId);
  }
  query += ' ORDER BY date DESC';

  const stmt = dbInstance.prepare(query);
  if (params.length > 0) stmt.bind(params);

  const dates: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.date) dates.push(row.date as string);
  }
  stmt.free();
  return dates;
}

/**
 * Returns summary stats about the SQLite database.
 */
export function getDatabaseStats(userId?: string): DatabaseStats {
  if (!dbInstance) {
    return {
      taskCount: 0,
      completedTaskCount: 0,
      subtaskCount: 0,
      noteCount: 0,
      distinctDaysCount: 0,
      dbSizeBytes: 0,
    };
  }

  let taskCount = 0;
  let completedTaskCount = 0;
  let subtaskCount = 0;
  let noteCount = 0;

  let taskQuery = 'SELECT COUNT(*) as cnt, SUM(completed) as comp FROM tasks';
  const params: any[] = [];
  if (userId) {
    taskQuery += ' WHERE (user_id = ? OR (user_id IS NULL AND ? = "demo_user"))';
    params.push(userId, userId);
  }

  const tStmt = dbInstance.prepare(taskQuery);
  if (params.length > 0) tStmt.bind(params);
  if (tStmt.step()) {
    const res = tStmt.getAsObject();
    taskCount = (res.cnt as number) || 0;
    completedTaskCount = (res.comp as number) || 0;
  }
  tStmt.free();

  let stQuery = 'SELECT COUNT(*) as cnt FROM subtasks';
  if (userId) {
    stQuery = `SELECT COUNT(*) as cnt FROM subtasks st 
               JOIN tasks t ON st.task_id = t.id 
               WHERE (t.user_id = ? OR (t.user_id IS NULL AND ? = "demo_user"))`;
  }
  const stStmt = dbInstance.prepare(stQuery);
  if (userId) stStmt.bind([userId, userId]);
  if (stStmt.step()) {
    subtaskCount = (stStmt.getAsObject().cnt as number) || 0;
  }
  stStmt.free();

  let noteQuery = 'SELECT COUNT(*) as cnt FROM notes';
  if (userId) {
    noteQuery += ' WHERE (user_id = ? OR (user_id IS NULL AND ? = "demo_user"))';
  }
  const nStmt = dbInstance.prepare(noteQuery);
  if (userId) nStmt.bind([userId, userId]);
  if (nStmt.step()) {
    noteCount = (nStmt.getAsObject().cnt as number) || 0;
  }
  nStmt.free();

  const dates = getDistinctTaskDates(userId);
  const binary = dbInstance.export();

  return {
    taskCount,
    completedTaskCount,
    subtaskCount,
    noteCount,
    distinctDaysCount: dates.length,
    dbSizeBytes: binary.length,
  };
}

/**
 * Exports SQLite database as a real downloadable .sqlite file.
 */
export function exportDatabaseFile(): void {
  if (!dbInstance) return;
  const binary = dbInstance.export();
  const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `my_todo_list_${getTodayDateString()}.sqlite`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Executes a custom read-only SQL query for learning purposes!
 */
export function runCustomQuery(sqlQuery: string): { columns: string[]; values: any[][]; error?: string } {
  if (!dbInstance) return { columns: [], values: [], error: 'Database not initialized' };
  try {
    const res = dbInstance.exec(sqlQuery);
    logQuery(sqlQuery);
    if (res.length > 0) {
      return { columns: res[0].columns, values: res[0].values };
    }
    return { columns: [], values: [] };
  } catch (err: any) {
    return { columns: [], values: [], error: err.message || 'SQL execution failed' };
  }
}
