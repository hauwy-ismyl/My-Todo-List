import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Note } from '../types';

interface NotesSectionProps {
  notes: Note[];
  onAddNote: (title: string, body: string, category?: string) => Promise<void>;
  onUpdateNote: (id: string, title: string, body: string, category?: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export const NotesSection: React.FC<NotesSectionProps> = ({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');

  // Editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');

  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    await onAddNote(newTitle.trim(), newBody.trim(), newCategory);
    setNewTitle('');
    setNewBody('');
    setIsCreating(false);
  };

  const handleStartEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditCategory(note.category || 'Personal');
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editTitle.trim() || !editBody.trim()) return;
    await onUpdateNote(editingNoteId, editTitle.trim(), editBody.trim(), editCategory);
    setEditingNoteId(null);
  };

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      (n.category && n.category.toLowerCase().includes(q))
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-5">
      {/* Notes Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Notes & Ideas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep track of thoughts, meeting takeaways, and quick reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search notes */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full sm:w-44 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* New Note Button */}
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          )}
        </div>
      </div>

      {/* Note Creation Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateNote}
          className="bg-white rounded-2xl border border-indigo-200/80 shadow-sm p-4 sm:p-5 transition-all"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Create New Note</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Book recommendations, Meeting recap, Project outline"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                required
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
                <option value="Learning">Learning</option>
                <option value="Ideas">Ideas</option>
              </select>
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                placeholder="Write your note content here..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || !newBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const isEditingThisNote = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-sm transition-all p-4 sm:p-5 flex flex-col justify-between"
              >
                {isEditingThisNote ? (
                  /* Edit Note Form */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-semibold rounded-lg border border-indigo-400 focus:outline-none"
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Work">Work</option>
                      <option value="Learning">Learning</option>
                      <option value="Ideas">Ideas</option>
                    </select>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={5}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-indigo-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!editTitle.trim() || !editBody.trim()}
                        className="px-3 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal Note Display */
                  <>
                    <div>
                      {/* Top row: Category & actions */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {note.category || 'General'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(note)}
                            title="Edit note"
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            title="Delete note"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-semibold text-slate-900 mb-2 break-words">
                        {note.title}
                      </h4>

                      {/* Body */}
                      <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap break-words leading-relaxed">
                        {note.body}
                      </p>
                    </div>

                    {/* Bottom row: timestamp */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Updated {formatDate(note.updatedAt)}</span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
            <BookOpen className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No notes yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No notes matching "${searchQuery}".`
              : 'Write down instructions, ideas, or meeting notes to keep everything in one place.'}
          </p>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Note</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
