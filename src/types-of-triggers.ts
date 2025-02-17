import { QueueType } from "./index.js";
import { AsyncQueue } from "./queue.js";

export interface BaseTrigger {
    intensity: number;
    duration: number;
    triggers: string[];
    shouldPrintCause: boolean;

    checkMessageAndDoShit(message: string, queue: AsyncQueue<QueueType>, author: string): void;
}

abstract class ImmediateTrigger implements BaseTrigger {
    intensity: number;
    duration: number;
    triggers: string[];
    shouldPrintCause: boolean;

    constructor(intensity: number, duration: number, triggers: string[], shouldPrintCause = false) {
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
            if (message.includes(t)) return 0;
        }
        return 1;
    }
}

export class ImmediateDontHaveTrigger extends ImmediateTrigger {
    doItTrigger(message: string): number {
        let count = 0;
        for (const t of this.triggers) {
            const reg = new RegExp(t, "g")
            const subCount = (message.match(reg) || []).length;
            count += subCount
        }
        return count;
    }
}

export class ContinuousTrigger implements BaseTrigger {
    private interval: NodeJS.Timeout | undefined;
    intensity: number;
    duration: number;
    triggers: string[];
    stops: string[];
    shouldPrintCause: boolean;

    constructor(intensity: number, duration: number, triggers: string[], stops: string[], shouldPrintCause = false) {
        this.intensity = intensity;
        this.duration = duration;
        this.triggers = triggers;
        this.stops = stops;
        this.shouldPrintCause = shouldPrintCause;
    }


    checkMessageAndDoShit(message: string, queue: AsyncQueue<QueueType>, author: string): void {
        let solved: boolean = false;
        for (const save of this.stops) {
            if (message.includes(save)) {
                solved = true;
                break;
            }
        }
        if (solved) { 
            clearInterval(this.interval) 
            this.interval = undefined;
        }

        let hasTriggered = false;
        for (const t of this.triggers) {
            if (message.includes(t)) {
                hasTriggered = true;
                break;
            }
        }

        if(hasTriggered && this.interval === undefined){
            const duration = this.duration;
            const intensity = this.intensity;
            const messageToPrint = `${duration}s WITH INTENSITY ${intensity}`
            const addition = this.shouldPrintCause ? ` (DUE TO MESSAGE "${message}" [CONTINUOUS])` : ""
            this.interval = setInterval(() => {
                queue.enqueue({message: messageToPrint + addition, duration: duration, intensity: intensity, author})
            }, duration * 2 * 1000)
        }
    }
}
