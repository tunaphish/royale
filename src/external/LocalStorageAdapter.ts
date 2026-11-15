// localStorage.getItem("royale:playersave")
const key = "royale:playersave";

export class LocalStorageAdapter {
  save(data: PlayerSave): void {
    localStorage.setItem(key, JSON.stringify(data))
  }

  /** The saved game, or null if nothing has been saved yet. */
  load(): PlayerSave | null {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }
}