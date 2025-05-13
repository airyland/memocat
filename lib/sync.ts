import { db } from './db'
import type { Note } from './types'

export class FileSync {
  private timer: NodeJS.Timeout | null = null
  private fileHandle: FileSystemFileHandle | null = null

  async loadFromFile(): Promise<void> {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'JSON Files',
          accept: {
            'application/json': ['.json']
          }
        }]
      })
      
      const file = await fileHandle.getFile()
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
        throw new Error('Invalid data format: expected an array of notes or an object with notes array')
      }

      // Validate notes
      if (!notesToImport.every(note => 
        note && 
        typeof note === 'object' && 
        typeof note.content === 'string' && 
        Array.isArray(note.tags) &&
        (note.createdAt || note.created_at) &&
        (note.updatedAt || note.updated_at)
      )) {
        throw new Error('Invalid note format in data')
      }

      // Clear existing data
      const dbInstance = await db.getDBInstance()
      await dbInstance.notes.clear()
      
      // Import all data with date normalization
      await dbInstance.notes.bulkAdd(notesToImport.map((note: any) => ({
        ...note,
        // Handle different date field names and ensure they are dates
        createdAt: new Date(note.createdAt || note.created_at),
        updatedAt: new Date(note.updatedAt || note.updated_at),
        // Ensure tags is always an array
        tags: Array.isArray(note.tags) ? note.tags : []
      })))
      
      this.fileHandle = fileHandle
      console.log('Data imported successfully')
    } catch (error) {
      console.error('Error importing file:', error)
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
