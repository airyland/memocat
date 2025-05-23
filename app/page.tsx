"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react"
import { initializeDB, db } from "@/lib/db"
import { fileSync } from "@/lib/sync"
import type { Note } from "@/lib/types"
import NoteItem from "@/components/note-item"

export default function Home() {
  const [content, setContent] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])

  // Initialize content from localStorage on client side
  useEffect(() => {
    const savedContent = typeof window !== 'undefined' ? localStorage.getItem('memocat_draft') : null
    if (savedContent) {
      setContent(savedContent)
    }
  }, [])
  const [notes, setNotes] = useState<Note[]>([])
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [activeTag, setActiveTag] = useState("")
  const [hasFileHandle, setHasFileHandle] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle')
  const [fileName, setFileName] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const extractTags = (text: string): string[] => {
    const tagRegex = /#([^\s#]+)/g
    const tags: string[] = []
    let match
    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1])
    }
    return tags
  }

  useEffect(() => {
    const init = async () => {
      await initializeDB()
      setIsDbInitialized(true)
      loadNotes()
      fileSync.startAutoSync()
    }
    init()

    return () => {
      fileSync.stopAutoSync()
    }
  }, [])

  useEffect(() => {
    setHasFileHandle(fileSync.hasFileHandle())
    if (fileSync.fileHandle) {
      setFileName(fileSync.fileHandle.name)
    }
  }, [])

  const filterNotes = useCallback((notesToFilter: Note[], query: string) => {
    let filtered = notesToFilter
    
    if (activeTag) {
      filtered = filtered.filter(note => note.tags.includes(activeTag))
    }
    
    if (query) {
      filtered = filtered.filter(note =>
        note.content.toLowerCase().includes(query.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
    }
    
    setFilteredNotes([...filtered]);
  }, [activeTag, searchQuery]);

  useEffect(() => {
    if (isDbInitialized) {
      filterNotes(notes, searchQuery);
    }
  }, [activeTag, searchQuery, isDbInitialized, notes]);

  const loadNotes = async () => {
    try {
      const fetchedNotes = await db.notes.toArray();
      setNotes(fetchedNotes);
      filterNotes(fetchedNotes, searchQuery);
      syncToDisk();
    } catch (error) {
      console.error("Error loading notes:", error);
    }
  };

  const syncToDisk = async () => {
    if (!hasFileHandle) return
    try {
      setSyncStatus('syncing')
      await fileSync.saveToFile()
      setSyncStatus('done')
      setTimeout(() => {
        setSyncStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Error saving file:', error)
      setSyncStatus('idle')
    }
  }

  const handleManualSave = () => syncToDisk()

  const handleImportFile = async () => {
    // Check if running on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      const dialog = document.createElement('dialog')
      dialog.className = 'fixed inset-0 m-auto h-fit w-fit'
      
      const style = document.createElement('style')
      style.textContent = `
        dialog::backdrop {
          background-color: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(2px);
        }
        dialog {
          padding: 0;
          border: none;
          border-radius: 8px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        dialog:focus {
          outline: none;
        }
      `
      document.head.appendChild(style)
      
      dialog.innerHTML = `
        <div class="text-center w-[320px]">
          <div class="window-chrome pt-4 pb-6 px-6">
            <div class="window-dots">
              <div class="window-dot window-dot-red cursor-pointer" onclick="this.closest('dialog').close()"></div>
              <div class="window-dot window-dot-yellow"></div>
              <div class="window-dot window-dot-green"></div>
            </div>
            <h3 class="text-lg font-medium mt-6 mb-4">Desktop Required</h3>
            <p class="text-sm text-gray-600 mb-6">
              To sync notes with your disk, please use a desktop browser. Mobile browsers don't support the File System Access API.
            </p>
          </div>
        </div>
      `
      
      document.body.appendChild(dialog)
      dialog.showModal()
      
      dialog.addEventListener('close', () => {
        dialog.remove()
        style.remove()
      })
      
      return
    }

    try {
      const choice = await new Promise<'new' | 'load' | null>((resolve) => {
        const dialog = document.createElement('dialog')
        dialog.className = 'fixed inset-0 m-auto h-fit w-fit'
        
        const style = document.createElement('style')
        style.textContent = `
          dialog::backdrop {
            background-color: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(2px);
          }
          dialog {
            padding: 0;
            border: none;
            border-radius: 8px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          dialog:focus {
            outline: none;
          }
          .window-dot-red {
            cursor: pointer;
          }
          .window-dot-red:hover {
            opacity: 0.8;
          }
        `
        document.head.appendChild(style)
        
        dialog.innerHTML = `
          <div class="text-center w-[320px]">
            <div class="window-chrome pt-4 pb-6 px-6">
              <div class="window-dots">
                <div class="window-dot window-dot-red" onclick="this.closest('dialog').close()"></div>
                <div class="window-dot window-dot-yellow"></div>
                <div class="window-dot window-dot-green"></div>
              </div>
              <h3 class="text-lg font-medium mt-6 mb-6">Choose Storage Option</h3>
              <div class="space-y-3">
                <button class="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors" data-choice="new">
                  <div class="font-medium">Create new notes file</div>
                  <div class="text-xs text-gray-500 mt-1">Start with a fresh notes collection</div>
                </button>
                <button class="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors" data-choice="load">
                  <div class="font-medium">Load existing notes</div>
                  <div class="text-xs text-gray-500 mt-1">Import notes from a saved file</div>
                </button>
              </div>
            </div>
          </div>
        `
        
        const handleClick = (e: MouseEvent) => {
          const button = (e.target as HTMLElement).closest('button')
          if (button?.dataset.choice) {
            const choice = button.dataset.choice as 'new' | 'load'
            dialog.remove()
            style.remove()
            resolve(choice)
          }
        }

        dialog.addEventListener('click', handleClick)
        document.body.appendChild(dialog)
        dialog.showModal()
      })

      if (!choice) {
        return
      }

      if (choice === 'new') {
        const handle = await window.showSaveFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }],
          suggestedName: 'memocat-notes.json'
        })
        
        const writable = await handle.createWritable()
        await writable.write(JSON.stringify({ notes: [] }, null, 2))
        await writable.close()
        
        fileSync.fileHandle = handle
        setHasFileHandle(true)
        setFileName(handle.name)
      } else {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: {
              'application/json': ['.json']
            }
          }]
        })
        
        fileSync.fileHandle = handle
        setHasFileHandle(true)
        setFileName(handle.name)
      }
      
      await fileSync.loadContent()
      loadNotes()
    } catch (error) {
      console.error('Error importing file:', error)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    // Save to localStorage when content changes
    if (typeof window !== 'undefined') {
      if (newContent) {
        localStorage.setItem('memocat_draft', newContent)
      } else {
        localStorage.removeItem('memocat_draft')
      }
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!content.trim()) return

      try {
        const tags = extractTags(content)
        const note: Note = {
          id: Date.now(),
          content: content.trim(),
          tags,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await db.notes.add(note)
        setContent("")
        // Clear localStorage after publishing
        if (typeof window !== 'undefined') {
          localStorage.removeItem('memocat_draft')
        }
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
        loadNotes()
      } catch (error) {
        console.error("Error adding note:", error)
      }
    }
  }

  const handleTagClick = (tag: string) => {
    const newActiveTag = tag === activeTag ? "" : tag;
    setActiveTag(newActiveTag);
  };

  const handleDeleteNote = async (id: number) => {
    await db.notes.delete(id)
    loadNotes()
    syncToDisk()
  }

  const handleUpdateNote = async (id: number, updates: Partial<Note>) => {
    await db.notes.update(id, {
      ...updates,
      updatedAt: new Date()
    })
    loadNotes()
  }

  const exportNotes = async () => {
    try {
      const allNotes = await db.notes.toArray()
      const jsonData = JSON.stringify(allNotes, null, 2)
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `memocat-notes-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting notes:", error)
    }
  }

  if (!isDbInitialized) {
    return <></>
  }

  return (
    <main className="min-h-screen py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="window-chrome pb-6 px-6 mb-4">
          <div className="h-9 relative -mx-6 px-6">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 window-dots flex gap-1.5">
              <div className="window-dot window-dot-red cursor-pointer"></div>
              <div className="window-dot window-dot-yellow"></div>
              <div className="window-dot window-dot-green"></div>
            </div>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center">
              <div className="text-gray-500 text-sm">memocat.local</div>
            </div>
          </div>

          <div className="mt-8 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Hello</h1>
                <div className="text-sm text-gray-400">Welcome back to your notes.</div>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {!hasFileHandle ? (
                  <button
                    onClick={handleImportFile}
                    className="whitespace-nowrap px-3 py-1 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <span className="whitespace-nowrap">Load from disk</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      fileSync.fileHandle = null
                      setHasFileHandle(false)
                      setFileName('')
                    }}
                    className="whitespace-nowrap px-3 py-1 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    title="Disconnect from file"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="whitespace-nowrap">Connected to {fileName}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your thoughts"
              className="w-full min-h-[120px] p-4 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            />
            <div className="mt-2 text-xs text-gray-400">
              Use #tag to add tags. Press Command+Enter to publish. 
            </div>
          </div>

          {notes.length > 5 && (
            <div className="mt-6 mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-[400px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    filterNotes(notes, e.target.value)
                  }}
                  placeholder="Search notes..."
                  className="w-full px-3 py-2 pr-8 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[36px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      filterNotes(notes, '')
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {activeTag && (
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setActiveTag('')}
                    className="text-xs border border-gray-300 px-3 py-2 rounded-lg h-[36px]"
                  >
                    Clear filter: #{activeTag}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-8">
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onTagClick={handleTagClick}
                activeTag={activeTag}
                onNoteUpdated={loadNotes}
              />
            ))}
            {filteredNotes.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {activeTag ? "No notes found with this tag" : searchQuery ? "No notes found with this search" : "Start adding your first note!"}
              </div>
            )}
          </div>
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
        </div>

        <footer className="pt-4 text-xs text-gray-400 text-center">
          <p>MemoCat — Your elegant note-taking companion</p>
          <p className="mt-1">All notes are stored locally in your browser/disk</p>
          <div className="mt-3">
            © {new Date().getFullYear()} <a href="https://x.com/we_webmaster" className="hover:text-gray-600" target="_blank" rel="noopener noreferrer">x.com/we_webmaster</a> · <a href="https://github.com/airyland/memocat" className="hover:text-gray-600" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <div className="mt-1">Made with ❤️ and AI</div>
        </footer>
      </div>
    </main>
  )
}
