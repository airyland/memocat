import type { Note } from "./types"
import type Dexie from "dexie"

// Create a singleton instance to ensure we only have one Dexie instance
let dbInstance: any = null

// Initialize the database asynchronously to avoid version conflicts
export async function initializeDB() {
  if (dbInstance) return dbInstance

  // Dynamically import Dexie to avoid version conflicts
  const Dexie = (await import("dexie")).default

  // Define the database
  class MemoCatDB extends Dexie {
    notes: any

    constructor() {
      super("MemoCatDB")
      this.version(1).stores({
        notes: "++id, createdAt, updatedAt, *tags",
      })
      
      // Add hooks to handle date conversion
      this.notes = this.table("notes")
      
      // Convert dates to Date objects when reading from DB
      this.notes.hook('reading', (obj: any) => {
        if (obj.createdAt) {
          obj.createdAt = new Date(obj.createdAt)
        }
        if (obj.updatedAt) {
          obj.updatedAt = new Date(obj.updatedAt)
        }
        return obj
      })
    }
  }

  dbInstance = new MemoCatDB()
  return dbInstance
}

// Create a proxy object for database operations
export const db = {
  async getDBInstance() {
    return initializeDB()
  },

  notes: {
    async add(note: Note) {
      const db = await initializeDB()
      return db.notes.add({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
      })
    },

    async update(id: number, note: Partial<Note>) {
      const db = await initializeDB()
      const updateData = { ...note }
      if (note.updatedAt) {
        updateData.updatedAt = note.updatedAt.toISOString()
      }
      return db.notes.update(id, updateData)
    },

    async delete(id: number) {
      const db = await initializeDB()
      return db.notes.delete(id)
    },

    async bulkPut(notes: Note[]) {
      const db = await initializeDB()
      const serializedNotes = notes.map(note => ({
        ...note,
        createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
        updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt
      }))
      return db.notes.bulkPut(serializedNotes)
    },

    async toArray() {
      const db = await initializeDB()
      const notes = await db.notes.toArray()
      return notes.sort((a: Note, b: Note) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    },

    async orderBy(key: string) {
      const db = await initializeDB()
      const notes = await db.notes.toArray()
      return notes.sort((a: any, b: any) => b[key] - a[key])
    },

    async filter(filterFunction: (note: Note) => boolean) {
      const db = await initializeDB()
      const allNotes = await db.notes.toArray()
      return allNotes
        .filter(filterFunction)
        .sort((a: Note, b: Note) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
  }
}
