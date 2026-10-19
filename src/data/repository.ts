import { openDB, type IDBPDatabase } from "idb";
import type { State } from "../domain/model";
export interface FamilyRepository {
  load(): Promise<State | undefined>;
  save(state: State): Promise<void>;
  putPhoto(id: string, blob: Blob): Promise<void>;
  getPhoto(id: string): Promise<Blob | undefined>;
  reset(): Promise<void>;
}
export class DemoRepository implements FamilyRepository {
  private database?: Promise<IDBPDatabase>;
  private db() {
    return (this.database ??= openDB("family-space-demo", 1, {
      upgrade(db) {
        db.createObjectStore("state");
        db.createObjectStore("photos");
      },
    }));
  }
  async load() {
    return (await this.db()).get("state", "family") as Promise<State | undefined>;
  }
  async save(state: State) {
    await (await this.db()).put("state", state, "family");
  }
  async putPhoto(id: string, blob: Blob) {
    await (await this.db()).put("photos", blob, id);
  }
  async getPhoto(id: string) {
    return (await this.db()).get("photos", id) as Promise<Blob | undefined>;
  }
  async reset() {
    const db = await this.db();
    const tx = db.transaction(["state", "photos"], "readwrite");
    await Promise.all([
      tx.objectStore("state").clear(),
      tx.objectStore("photos").clear(),
      tx.done,
    ]);
  }
}
