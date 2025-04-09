import { Collection } from 'discord.js';
import fs, { readFileSync } from 'node:fs'

export type CodesData =
    { type: "pishock", shareCode: string }
    | { type: "lovense", shareCode: string }

export type CodesType = CodesData['type']

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

class CodeStore extends JSONStore<string, CodesData[]>{

    public getCode<T extends CodesType>(userId: string, type: T): Extract<CodesData, {type: T}> | undefined{
        const allCodesOfUser = this.get(userId)
        if(allCodesOfUser === undefined) return undefined

        const pishockCode = allCodesOfUser.find(e => e.type === type)
        return pishockCode as Extract<CodesData, {type: T}>
    }

    public setCode<T extends CodesType>(userId: string, type: T, data: Omit<Extract<CodesData, {type: T}>, 'type'>){
        const allCodesOfUser = this.get(userId)
        if(allCodesOfUser === undefined){
            this.set(userId, [{type, ...data}])
            return;
        }

        const code = allCodesOfUser.find(e => e.type === type)
        if(code === undefined){
            allCodesOfUser.push({type, ...data})
        }else{
            switch(type){
                case 'pishock':
                    code.shareCode = data.shareCode;
                    break;
                case 'lovense':
                    code.shareCode = data.shareCode;
                    break;
            }
        }
    }

    public hasCode(userId: string, type: CodesType): boolean{
        // we're lazy in this town
        return this.getCode(userId, type) !== undefined
    }
}

export const CODES_STORE: CodeStore = new CodeStore('user-store.json')
