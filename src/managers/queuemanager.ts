import { PiShockAPI } from "../pishock.js";
import { AsyncQueue } from "../queue.js";
import { QueueLoop, QueueType } from "../queueloop.js";
import { CODES_STORE, CodesData, CodesType } from "../stores/usercodes-store.js";
import dotenv from 'dotenv'
dotenv.config()

export class NoPishockCodeError extends Error{}

// Use this in case I'm not gonna hardcode it from process.env. Surely not tho :^)
function createPishockQueueFactory(apiKey: string, username: string, apiUrl: string) {
    return function (shareCode: string, queueName: string): QueueType {
        const PISHOCK = new PiShockAPI(
            apiKey,
            username,
            shareCode,
            apiUrl,
        )
        return {
            queue: new AsyncQueue(),
            shouldRead: true,
            callback: async (v) => {
                console.log(`PISHOCK FROM QUEUE '${queueName}' INTENSITY ${v.intensity} DURATION ${v.duration}`)
                await PISHOCK.sendShock(`SHOCKBOT[${queueName}]`, v.duration, v.intensity)
                return 2 * v.duration * 1000
            }
        }
    }
}

const createPishockQueue = createPishockQueueFactory(process.env.PISHOCK_API_KEY!, process.env.PISHOCK_USERNAME!, process.env.PISHOCK_API_URL!)

function convertToKey(userId: string, type: CodesType): string {
    return `${userId}|${type}`
}

export class QueueManager {
    private queueLoop = new QueueLoop()
    private userToQueueMap = new Map<string, QueueType>()

    /**
     * @throws {NoPishockCodeError}
     */
    public getQueueOrCreate(userId: string, type: CodesType){
        const key = convertToKey(userId, type)
        if(!this.userToQueueMap.has(key)) {
            this.addUserQueue(userId, type)
        }

        return this.userToQueueMap.get(key)!.queue
    }

    /**
     * @throws {NoPishockCodeError}
     */
    private addUserQueue(userId: string, type: CodesType) {
        const key = convertToKey(userId, type)
        if (this.userToQueueMap.has(key)) return
        let queue: QueueType
        switch(type){
            case "pishock":
                const pishockCode = CODES_STORE.getCode(userId, "pishock")
                if(pishockCode === undefined) throw new NoPishockCodeError()
                queue = createPishockQueue(pishockCode.shareCode, userId)
                break;
            case "lovense":
                throw new Error("Not implemented")
                break;
        }
        this.userToQueueMap.set(key, queue)
        this.queueLoop.addQueue(queue)

    }

    public deleteUserQueue(userId: string, type: CodesData['type']) {
        const key = convertToKey(userId, type)
        const queue = this.userToQueueMap.get(key)
        if(queue === undefined) return
        this.queueLoop.removeQueue(queue)
        this.userToQueueMap.delete(key)
    }
}