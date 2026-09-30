import React, { useState } from 'react';
import {
  Check,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar,
  X,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { Task, Subtask } from '../types';

interface TaskItemProps {
  task: Task;
  onToggleTask: (id: string, completed: boolean) => Promise<void>;
  onUpdateTask: (id: string, newText: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, text: string) => Promise<Subtask>;
  onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  onUpdateSubtask: (subtaskId: string, text: string) => Promise<void>;
  onDeleteSubtask: (subtaskId: string) => Promise<void>;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}) => {
  // Editing state for main task
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editPriority, setEditPriority] = useState(task.priority);

  // Subtasks display state
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskDraft, setEditingSubtaskDraft] = useState('');

  const completedSubtasksCount = task.subtasks.filter((st) => st.completed).length;

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    await onUpdateTask(task.id, editText.trim(), editPriority);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(task.text);
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  const handleAddSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;
    await onAddSubtask(task.id, newSubtaskText.trim());
    setNewSubtaskText('');
    setShowSubtasks(true);
  };

  const handleSaveSubtaskEdit = async (stId: string) => {
    if (!editingSubtaskDraft.trim()) return;
    await onUpdateSubtask(stId, editingSubtaskDraft.trim());
    setEditingSubtaskId(null);
  };

  // Format date nicely (e.g. Today, Yesterday, or formatted date)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTaskDate = (dateStr: string) => {
    if (dateStr === getTodayStr()) return 'Today';
    if (dateStr === getYesterdayStr()) return 'Yesterday';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const priorityColors = {
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div
      className={`group bg-white rounded-xl border transition-all duration-150 ${
        task.completed
          ? 'border-slate-200/60 bg-slate-50/40 opacity-90'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Main Task Row */}
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleTask(task.id, !task.completed)}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
          className={`mt-0.5 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            task.completed
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'border-2 border-slate-300 hover:border-indigo-600 bg-white'
          }`}
        >
          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Content area: normal or inline editing */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-indigo-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Task Text with visual indication of completion */}
              <p
                onClick={() => onToggleTask(task.id, !task.completed)}
                className={`text-sm sm:text-base font-normal select-none break-words cursor-pointer transition-all ${
                  task.completed
                    ? 'line-through text-slate-400 decoration-slate-300'
                    : 'text-slate-800'
                }`}
              >
                {task.text}
              </p>

              {/* Meta tags: Date, Priority, Subtask Counter */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {/* Date tag */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {formatTaskDate(task.date)}
                </span>

                {/* Priority tag */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    priorityColors[task.priority]
                  }`}
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span className="capitalize">{task.priority}</span>
                </span>

                {/* Subtask count badge & expand button */}
                {task.subtasks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium cursor-pointer transition-colors"
                  >
                    <span>
                      {completedSubtasksCount}/{task.subtasks.length} subtasks
                    </span>
                    {showSubtasks ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubtasks(!showSubtasks)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add subtask</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons (Edit & Delete) */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {/* Edit button */}
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditText(task.text);
              }}
              title="Edit task"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              title="Delete task"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Subtasks Section (Optional) */}
      {showSubtasks && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:px-4 sm:py-3 rounded-b-xl">
          <div className="space-y-2">
            {/* Existing subtasks list */}
            {task.subtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center gap-2.5 pl-6 sm:pl-7 group/sub"
              >
                {/* Subtask Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleSubtask(st.id, !st.completed)}
                  aria-label={st.completed ? 'Mark subtask incomplete' : 'Mark subtask complete'}
                  className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    st.completed
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 hover:border-indigo-500 bg-white'
                  }`}
                >
                  {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                {/* Subtask text or inline edit */}
                {editingSubtaskId === st.id ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingSubtaskDraft}
                      onChange={(e) => setEditingSubtaskDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveSubtaskEdit(st.id);
                        if (e.key === 'Escape') setEditingSubtaskId(null);
                      }}
                      className="flex-1 px-2 py-0.5 text-xs rounded border border-indigo-400 bg-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSubtaskEdit(st.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubtaskId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => onToggleSubtask(st.id, !st.completed)}
                    className={`flex-1 text-xs select-none cursor-pointer transition-all ${
                      st.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {st.text}
                  </span>
                )}

                {/* Subtask Edit & Delete actions */}
                {editingSubtaskId !== st.id && (
                  <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-1 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubtaskId(st.id);
                        setEditingSubtaskDraft(st.text);
                      }}
                      title="Edit subtask"
                      className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(st.id)}
                      title="Delete subtask"
                      className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Quick input to add a new subtask to this task */}
            <form onSubmit={handleAddSubtaskSubmit} className="flex gap-2 pl-6 sm:pl-7 pt-1">
              <input
                type="text"
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                placeholder="+ Add another subtask..."
                className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!newSubtaskText.trim()}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
