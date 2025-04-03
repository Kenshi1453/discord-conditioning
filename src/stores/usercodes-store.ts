import { Collection } from 'discord.js';
import fs, { readFileSync } from 'node:fs'

export type CodesType =
    { type: "pishock", shareCode: string }
    | { type: "lovense", shareCode: string }

class JSONStore<K, V> extends Collection<K, V> {
    private filePath: string

    constructor(filePath: string) {

        let userEntries: [K, V][];

        try {
            const fileContent = readFileSync(filePath, "utf-8")
            const temp: [K, V][] = JSON.parse(fileContent)
            userEntries = temp;
        } catch (e) {
            fs.writeFileSync(filePath, '[]')
            userEntries = []
        }
        super(userEntries)
        this.filePath = filePath
    }

    private updateFile() {
        if (this.filePath !== undefined){
            fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.entries())), { encoding: 'utf-8', flag: 'w+' })
        }
    }

    set(key: K, value: V): this {
        super.set(key, value)
        this.updateFile()
        return this
    }

    delete(key: K): boolean {
        const res = super.delete(key)
        if (res)
            this.updateFile()
        return res
    }
}

export const CODES_STORE: Collection<string, CodesType[]> = new JSONStore<string, CodesType[]>('user-store.json')
console.log(CODES_STORE)

