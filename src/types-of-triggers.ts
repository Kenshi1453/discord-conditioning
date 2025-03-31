import { QueueType } from "./index.js";
import { AsyncQueue } from "./queue.js";

export interface BaseTrigger {
    intensity: number;
    duration: number;
    triggers: (string | RegExp)[];
    shouldPrintCause: boolean;

    checkMessageAndDoShit(message: string, queue: AsyncQueue<QueueType>, author: string): void;
}

abstract class ImmediateTrigger implements BaseTrigger {
    intensity: number;
    duration: number;
    triggers: (string | RegExp)[];
    shouldPrintCause: boolean;

    constructor(intensity: number, duration: number, triggers: (string | RegExp)[], shouldPrintCause = false) {
        this.intensity = intensity;
        this.duration = duration;
        this.triggers = triggers;
        this.shouldPrintCause = shouldPrintCause;
    }

    checkMessageAndDoShit(message: string, queue: AsyncQueue<QueueType>, author: string): void {
        const messageToPrint = `${this.duration}s WITH INTENSITY ${this.intensity}`
        const addition = this.shouldPrintCause ? ` (DUE TO MESSAGE "${message}" [INSTANT])` : ""
        for(let i = 0; i< this.doItTrigger(message); i++) {
            queue.enqueue({ message: messageToPrint + addition, duration: this.duration, intensity: this.intensity, author })
        }
    }

    abstract doItTrigger(message: string): number;
}

export class ImmediateMustHaveTrigger extends ImmediateTrigger {
    doItTrigger(message: string): number {
        for (const t of this.triggers) {
            let checkResult: boolean = false;
            if(t instanceof RegExp){
                checkResult = t.test(message)
            }else{
                checkResult = message.toLowerCase().includes(t);
            }
            if(checkResult) return 0;
        }
        return 1;
    }
}

export class ImmediateDontHaveTrigger extends ImmediateTrigger {
    doItTrigger(message: string): number {
        let count = 0;
        for (const t of this.triggers) {
            const reg = new RegExp(t, "g")
            const str = t instanceof RegExp ? message : message.toLowerCase()
            const subCount = (str.match(reg) || []).length;
            count += subCount
        }
        return count;
    }
}

export class ContinuousTrigger implements BaseTrigger {
    private interval: NodeJS.Timeout | undefined;
    intensity: number;
    duration: number;
    triggers: (string | RegExp)[];
    stops: (string | RegExp)[];
    shouldPrintCause: boolean;

    constructor(intensity: number, duration: number, triggers: (string | RegExp)[], stops: (string | RegExp)[], shouldPrintCause = false) {
        this.intensity = intensity;
        this.duration = duration;
        this.triggers = triggers;
        this.stops = stops;
        this.shouldPrintCause = shouldPrintCause;
    }


    checkMessageAndDoShit(message: string, queue: AsyncQueue<QueueType>, author: string): void {
        let solved: boolean = false;
        
        for (const save of this.stops) {
            let checkResult: boolean = false;
            if(save instanceof RegExp){
                checkResult = save.test(message)
            }else{
                checkResult = message.toLowerCase().includes(save);
            }
            if(checkResult){
                solved = true;
                break;
            }
        }
        if (solved) { 
            console.log(`[${this.triggers}, ${this.stops}] solved?`)
            clearInterval(this.interval) 
            this.interval = undefined;
        }

        let hasTriggered = false;
        for (const t of this.triggers) {
            let checkResult: boolean = false;
            if(t instanceof RegExp){
                checkResult = t.test(message)
            }else{
                checkResult = message.toLowerCase().includes(t);
            }
            if(checkResult){
                hasTriggered = true;
                break;
            }
        }

        if(hasTriggered && this.interval === undefined){
            const duration = this.duration;
            const intensity = this.intensity;
            const messageToPrint = `${duration}s WITH INTENSITY ${intensity}`
            const addition = this.shouldPrintCause ? ` (DUE TO MESSAGE "${message}" [CONTINUOUS])` : ""
            queue.enqueue({message: messageToPrint + addition, duration: duration, intensity: intensity, author})
            this.interval = setInterval(() => {
                queue.enqueue({message: messageToPrint + addition, duration: duration, intensity: intensity, author})
            }, duration * 2 * 1000)
        }
    }
}
