import type { Note } from "./types"

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
      this.notes = this.table("notes")
    }
  }

  dbInstance = new MemoCatDB()
  return dbInstance
}

// Create a proxy object for database operations
export const db = {
  notes: {
    add: async (...args: any[]) => {
      const realDb = await initializeDB()
      return realDb.notes.add(...args)
    },
    update: async (...args: any[]) => {
      const realDb = await initializeDB()
      return realDb.notes.update(...args)
    },
    delete: async (...args: any[]) => {
      const realDb = await initializeDB()
      return realDb.notes.delete(...args)
    },
    orderBy: (key: string) => {
      // This is a placeholder that will be replaced with the actual implementation
      // when the database is initialized
      return {
        reverse: () => ({
          toArray: async () => {
            const realDb = await initializeDB()
            return realDb.notes.orderBy(key).reverse().toArray()
          },
        }),
      }
    },
    filter: (filterFunction: (note: Note) => boolean) => {
      return {
        reverse: () => ({
          toArray: async () => {
            const realDb = await initializeDB()
            return realDb.notes.filter(filterFunction).reverse().toArray()
          },
        }),
      }
    },
  },
}
