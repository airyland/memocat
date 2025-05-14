import { db } from './db'
import type { Note } from './types'

export class FileSync {
  private timer: NodeJS.Timeout | null = null
  public fileHandle: FileSystemFileHandle | null = null

  setFileHandle(handle: FileSystemFileHandle) {
    this.fileHandle = handle
  }

  async loadContent(): Promise<void> {
    if (!this.fileHandle) {
      throw new Error('No file handle available')
    }

    try {
      const file = await this.fileHandle.getFile()
      const content = await file.text()
      const data = JSON.parse(content)

      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format: expected an object')
      }

      // Handle both array format and object format
      let notesToImport: any[] = []
      if (Array.isArray(data)) {
        notesToImport = data
      } else if (Array.isArray(data.notes)) {
        notesToImport = data.notes
      } else {
        notesToImport = []
      }

      const dbInstance = await db.getDBInstance()
      
      // Import data if any
      if (notesToImport.length > 0) {
        const existingNotes = await dbInstance.notes.toArray()
        const existingIds = new Set(existingNotes.map(note => note.id))
        
        // Merge notes - keep browser-side for same IDs, import new ones
        const notesToAdd = notesToImport
          .filter(note => !existingIds.has(note.id))
          .map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt || note.created_at),
            updatedAt: new Date(note.updatedAt || note.updated_at),
            tags: Array.isArray(note.tags) ? note.tags : []
          }))
        
        if (notesToAdd.length > 0) {
          await dbInstance.notes.bulkAdd(notesToAdd)
          
          // Update file with merged data
          if (this.fileHandle) {
            const allNotes = await dbInstance.notes.toArray()
            const writable = await this.fileHandle.createWritable()
            await writable.write(JSON.stringify({ notes: allNotes }, null, 2))
            await writable.close()
          }
        }
      }
      
      console.log('File loaded successfully')
    } catch (error) {
      console.error('Error loading file:', error)
      throw error
    }
  }

  async saveToFile(): Promise<void> {
    if (!this.fileHandle) {
      console.warn('No file handle available')
      return
    }

    try {
      // Add artificial delay to make the syncing state visible
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Get all data from Dexie
      const dbInstance = await db.getDBInstance()
      const notes = await dbInstance.notes.toArray()
      
      // Prepare full database export
      const exportData = {
        notes: notes.map(note => ({
          ...note,
          createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
          updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt
        }))
      }
      
      // Create JSON string
      const content = JSON.stringify(exportData, null, 2)
      
      // Get write permission and write to file
      const writable = await this.fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      
      console.log('Database saved successfully')
    } catch (error) {
      console.error('Error saving database:', error)
      throw error
    }
  }

  startAutoSync(): void {
    if (this.timer) {
      return
    }
    this.timer = setInterval(async () => {
      if (this.fileHandle) {
        await this.saveToFile()
      }
    }, 5000)
  }

  stopAutoSync(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  hasFileHandle(): boolean {
    return this.fileHandle !== null
  }
}

// Create singleton instance
export const fileSync = new FileSync()
