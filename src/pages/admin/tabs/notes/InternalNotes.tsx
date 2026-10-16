import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { InternalNote } from '../../../../types';
import { useAuth } from '../../../../context/AuthContext';
import { MessageSquare, Trash2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InternalNotes() {
  const { user, isAdmin } = useAuth();
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'internal_notes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as InternalNote)));
    });
    return () => unsub();
  }, []);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await addDoc(collection(db, 'internal_notes'), {
        content: newNote.trim(),
        createdBy: user?.uid || 'unknown',
        authorName: user?.displayName || user?.email || 'Staff',
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      setNewNote('');
      toast.success('Note added');
    } catch (e) {
      toast.error('Failed to add note');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!isAdmin) {
      toast.error('Only admins can resolve notes');
      return;
    }
    await updateDoc(doc(db, 'internal_notes', id), {
      status: currentStatus === 'pending' ? 'resolved' : 'pending'
    });
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete notes');
      return;
    }
    if (window.confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'internal_notes', id));
      toast.success('Note deleted');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <MessageSquare className="text-blue-600" /> Internal Notes / Board
        </h2>
        <form onSubmit={handleAddNote} className="flex gap-4">
          <input
            type="text"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Write a note or request for Admin..."
            className="flex-1 border border-gray-200 rounded-lg p-3"
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Add Note</button>
        </form>
      </div>

      <div className="grid gap-4">
        {notes.map(note => (
          <div key={note.id} className={`bg-white rounded-lg p-4 border-l-4 shadow-sm flex items-start justify-between ${note.status === 'resolved' ? 'border-green-500 opacity-75' : 'border-amber-500'}`}>
            <div>
              <p className="font-medium text-gray-900">{note.content}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>By: <strong>{note.authorName}</strong></span>
                <span>{new Date(note.createdAt).toLocaleString()}</span>
                <span className={`flex items-center gap-1 ${note.status === 'resolved' ? 'text-green-600' : 'text-amber-600'}`}>
                  {note.status === 'resolved' ? <CheckCircle size={14} /> : <Clock size={14} />} 
                  {note.status.toUpperCase()}
                </span>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleStatus(note.id, note.status)} className="p-2 text-gray-400 hover:text-green-600 bg-gray-50 rounded" title="Mark Resolved">
                  <CheckCircle size={18} />
                </button>
                <button onClick={() => handleDelete(note.id)} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded" title="Delete Note">
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
        {notes.length === 0 && <p className="text-gray-500 text-center py-8">No notes yet.</p>}
      </div>
    </div>
  );
}
