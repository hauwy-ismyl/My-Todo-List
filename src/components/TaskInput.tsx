import React, { useState } from 'react';
import { Plus, Calendar, ListPlus, X, Tag } from 'lucide-react';

interface TaskInputProps {
  onAddTask: (
    text: string,
    date: string,
    priority: 'low' | 'medium' | 'high',
    subtasks: string[]
  ) => Promise<void>;
  selectedDate: string;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, selectedDate }) => {
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

  const [text, setText] = useState('');
  const [taskDate, setTaskDate] = useState(
    selectedDate && selectedDate !== 'all' ? selectedDate : getTodayStr()
  );
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showSubtasksInput, setShowSubtasksInput] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskDraft, setNewSubtaskDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const allSubtasks = [...subtasks];
      if (newSubtaskDraft.trim()) {
        allSubtasks.push(newSubtaskDraft.trim());
      }
      await onAddTask(text.trim(), taskDate, priority, allSubtasks);
      setText('');
      setSubtasks([]);
      setNewSubtaskDraft('');
      setShowSubtasksInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDraftSubtask = () => {
    if (!newSubtaskDraft.trim()) return;
    setSubtasks([...subtasks, newSubtaskDraft.trim()]);
    setNewSubtaskDraft('');
  };

  const handleRemoveDraftSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-6 transition-all">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Main Task Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you need to do? (e.g., Read chapter 1, buy groceries)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white text-sm sm:text-base transition-all"
              required
            />
          </div>

          {/* Add Task Button */}
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:pointer-events-none text-white font-medium text-sm sm:text-base shadow-xs hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
        </div>

        {/* Optional Additions Row: Date, Priority, and Subtasks toggle */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date selection for assigning to Today, Yesterday, or past date */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer"
                title="Select date for this task"
              />
              {taskDate === getTodayStr() && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  Today
                </span>
              )}
              {taskDate === getYesterdayStr() && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  Yesterday
                </span>
              )}
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <Tag className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="bg-transparent text-xs text-slate-700 focus:outline-none cursor-pointer py-0.5 pr-1"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          {/* Optional Subtasks Toggle Button */}
          <button
            type="button"
            onClick={() => setShowSubtasksInput(!showSubtasksInput)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              showSubtasksInput || subtasks.length > 0
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            <span>
              {subtasks.length > 0
                ? `${subtasks.length} Subtask${subtasks.length > 1 ? 's' : ''}`
                : '+ Add Subtasks (Optional)'}
            </span>
          </button>
        </div>

        {/* Optional Subtasks Creation Area */}
        {showSubtasksInput && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">
              Add subtasks to break down this task (optional):
            </p>

            {/* List of subtasks queued for this task */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2.5">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700"
                  >
                    <span className="flex-1 truncate">• {st}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftSubtask(idx)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Remove subtask"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Subtask input and quick add */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskDraft}
                onChange={(e) => setNewSubtaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDraftSubtask();
                  }
                }}
                placeholder="Type a subtask step and press Enter..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddDraftSubtask}
                disabled={!newSubtaskDraft.trim()}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Add Subtask
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
