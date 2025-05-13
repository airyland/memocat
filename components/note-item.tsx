"use client"

import { useState } from "react"
import type { Note } from "@/lib/types"
import { initializeDB } from "@/lib/db"
import { formatDate } from "@/lib/utils"

interface NoteItemProps {
  note: Note
  onTagClick: (tag: string) => void
  activeTag: string | null
  onNoteUpdated: () => void
}

export default function NoteItem({ note, onTagClick, activeTag, onNoteUpdated }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [isHovered, setIsHovered] = useState(false)

  // Format content, highlight tags
  const formatContent = (content: string) => {
    const tagRegex = /#([^\s#]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = tagRegex.exec(content)) !== null) {
      // Add text before tag
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // Add tag
      const tag = match[1]
      const isActive = activeTag === tag || (activeTag && tag.startsWith(`${activeTag}/`))
      parts.push(
        <span
          key={`${match.index}-${tag}`}
          onClick={() => onTagClick(tag)}
          className={`tag ${isActive ? "tag-active" : "tag-inactive"}`}
        >
          #{tag}
        </span>,
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts
  }

  // Save edit
  const saveEdit = async () => {
    if (!editContent.trim()) {
      await deleteNote()
      return
    }

    // Extract tags
    const tagRegex = /#([^\s#]+)/g
    const tags = []
    let match
    while ((match = tagRegex.exec(editContent)) !== null) {
      tags.push(match[1])
    }

    try {
      const realDb = await initializeDB()
      await realDb.notes.update(note.id, {
        content: editContent,
        tags,
        updatedAt: new Date(),
      })
      setIsEditing(false)
      onNoteUpdated()
    } catch (error) {
      console.error("Error updating note:", error)
    }
  }

  // Delete note
  const deleteNote = async () => {
    try {
      const realDb = await initializeDB()
      await realDb.notes.delete(note.id)
      onNoteUpdated()
    } catch (error) {
      console.error("Error deleting note:", error)
    }
  }

  // Cancel edit
  const cancelEdit = () => {
    setEditContent(note.content)
    setIsEditing(false)
  }

  return (
    <div
      className="py-3 px-4 font-mono text-sm border border-gray-200 rounded-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded min-h-[100px] outline-none font-mono text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button onClick={cancelEdit} className="px-3 py-1 border border-gray-300 rounded-full text-xs">
              Cancel
            </button>
            <button onClick={saveEdit} className="px-3 py-1 bg-black text-white rounded-full text-xs">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex-grow">
            <div className="whitespace-pre-wrap mb-1">{formatContent(note.content)}</div>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <div>
                {note.updatedAt > note.createdAt
                  ? `edited ${formatDate(note.updatedAt)}`
                  : `${formatDate(note.createdAt)}`}
              </div>
              {isHovered && (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(true)} className="hover:text-black">
                    edit
                  </button>
                  <button onClick={deleteNote} className="hover:text-black">
                    delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
