import { openDatabaseAsync } from "expo-sqlite";
import { Repository } from "./repository";
let promise: Promise<Repository> | undefined;
export function openRepository() {
  return (promise ??= openDatabaseAsync("lifeos.db")
    .then(async (db) => {
      const repository = new Repository(db);
      await repository.migrate();
      return repository;
    })
    .catch((e) => {
      promise = undefined;
      throw e;
    }));
}
