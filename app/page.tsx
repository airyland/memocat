"use client"

import type React from "react"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { initializeDB } from "@/lib/db"
import type { Note } from "@/lib/types"
import NoteItem from "@/components/note-item"

export default function Home() {
  const [content, setContent] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isDbInitialized, setIsDbInitialized] = useState(false)

  // Initialize the database
  useEffect(() => {
    const init = async () => {
      await initializeDB()
      setIsDbInitialized(true)
      loadNotes()
    }
    init()
  }, [])

  // Load notes when activeTag changes
  useEffect(() => {
    if (isDbInitialized) {
      loadNotes()
    }
  }, [activeTag, isDbInitialized])

  // Load notes from the database
  const loadNotes = async () => {
    try {
      let fetchedNotes
      if (activeTag) {
        fetchedNotes = await (await initializeDB()).notes
          .filter((note: Note) => note.tags.some((tag: string) => tag === activeTag || tag.startsWith(`${activeTag}/`)))
          .reverse()
          .toArray()
      } else {
        fetchedNotes = await (await initializeDB()).notes.orderBy("createdAt").reverse().toArray()
      }
      setNotes(fetchedNotes)
    } catch (error) {
      console.error("Error loading notes:", error)
    }
  }

  // Handle Cmd/Ctrl+Enter to publish note
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && content.trim()) {
      e.preventDefault()
      addNote()
    }
  }

  // Add a new note
  const addNote = async () => {
    if (!content.trim()) return

    // Extract tags
    const tagRegex = /#([^\s#]+)/g
    const tags = []
    let match
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1])
    }

    const newNote: Omit<Note, "id"> = {
      content,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    try {
      const realDb = await initializeDB()
      await realDb.notes.add(newNote)
      setContent("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      loadNotes()
    } catch (error) {
      console.error("Error adding note:", error)
    }
  }

  // Handle tag click
  const handleTagClick = (tag: string) => {
    setActiveTag(tag === activeTag ? null : tag)
  }

  // Auto-adjust textarea height
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Export notes as JSON
  const exportNotes = async () => {
    try {
      const allNotes = await (await initializeDB()).notes.toArray()

      // Create a JSON blob
      const jsonData = JSON.stringify(allNotes, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `memocat-notes-${new Date().toISOString().split("T")[0]}.json`

      // Trigger download
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting notes:", error)
    }
  }

  return (
    <main className="min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="window-chrome pt-12 pb-6 px-6 mb-8">
          <div className="window-dots">
            <div className="window-dot window-dot-red"></div>
            <div className="window-dot window-dot-yellow"></div>
            <div className="window-dot window-dot-green"></div>
          </div>

          <div className="text-center mb-2 mt-2">
            <div className="text-gray-500 text-sm">memocat.local</div>
          </div>

          <div className="mt-8 mb-4">
            <div className="text-sm text-gray-400">Hello there, welcome back to your notes.</div>
          </div>

          <div className="mb-6">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your thoughts"
              className="w-full p-4 min-h-[80px] resize-none outline-none border border-gray-200 rounded-lg font-mono text-sm"
              rows={3}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">Use #tags to add tags, press Cmd/Ctrl+Enter to publish</span>
              <button
                onClick={addNote}
                disabled={!content.trim()}
                className="px-3 py-1 bg-black text-white rounded-full text-xs disabled:opacity-50"
              >
                Publish
              </button>
            </div>
          </div>

          {activeTag && (
            <div className="mb-4">
              <button
                onClick={() => setActiveTag(null)}
                className="text-xs border border-gray-300 px-3 py-1 rounded-full"
              >
                Clear filter: #{activeTag}
              </button>
            </div>
          )}

          <div className="space-y-4">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTagClick={handleTagClick}
                activeTag={activeTag}
                onNoteUpdated={loadNotes}
              />
            ))}
            {notes.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {activeTag ? "No notes found with this tag" : "Start adding your first note!"}
              </div>
            )}
          </div>

          {notes.length > 0 && (
            <div className="flex items-center justify-center mt-6 text-xs text-gray-400">
              <div className="border-t border-gray-200 w-16 mr-3"></div>
              <button
                onClick={exportNotes}
                className="flex items-center hover:text-black"
                title="Download notes as JSON"
              >
                {notes.length} notes - click to export all notes.
              </button>
              <div className="border-t border-gray-200 w-16 ml-3"></div>
            </div>
          )}

          <footer className="mt-8 pt-4 text-xs text-gray-400 text-center">
            <p>MemoCat — Your elegant note-taking companion</p>
            <p className="mt-1">All notes are stored locally in your browser</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
