export class LocalStoragePersistenceService {
    private _registeredUniqueKeys: Set<string> = new Set();

    private constructor() {}

    registerDataKey(key: string): void {
        if (this._registeredUniqueKeys.has(key)) {
            throw new Error(`Key already exists: ${key}`);
        }

        this._registeredUniqueKeys.add(key);
    }

    putData(key: string, data: string): void {
        this.assertDataKeyRegistered(key);
        localStorage.setItem(key, data);
    }

    getData(key: string): string {
        this.assertDataKeyRegistered(key);
        const data = localStorage.getItem(key);
        if (data === null) {
            throw new Error(`Data not found for key: ${key}`);
        }
        return data;
    }

    deleteData(key: string): void {
        this.assertDataKeyRegistered(key);
        localStorage.removeItem(key);
    }

    private assertDataKeyRegistered(key: string): void {
        if (!this._registeredUniqueKeys.has(key)) {
            throw new Error(`Key not registered: ${key}`);
        }
    }
}

export class BackendDatabasePersistenceService {}
