import { QUEUE_MANAGER } from "../index.js";
import { NoPishockCodeError } from "./queuemanager.js";



export class ShockManager{

    /**
     * 
     * @param userId discord user id
     * @param intensity integer between 1-100
     * @param duration integer between 1-15
     * @throws {NoPishockCodeError}
     */
    public queueShock(userId: string, intensity: number, duration: number){
        if(intensity < 1 || intensity > 100 || duration < 1 || duration > 15 ) throw new Error("Invalid params")
        const queue = QUEUE_MANAGER.getQueueOrCreate(userId, 'pishock')
        queue.enqueue({ author: 'funni', duration: duration, intensity: intensity, message: "fun" })
    }
}