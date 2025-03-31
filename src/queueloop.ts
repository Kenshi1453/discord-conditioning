import { QueueItemType } from "./index.js";
import { AsyncQueue } from "./queue.js";
import { waitUntil } from "./utils.js";

export type QueueType = { queue: AsyncQueue<QueueItemType>, shouldRead: boolean, callback: (v: QueueItemType) => Promise<number> }

class QueueLoop {
    // Map a queue with whether it's scheduled to be removed or not. Works as a list but easy to search through
    private queueMap: Map<QueueType, boolean>;

    constructor() {
        this.queueMap = new Map()
    }

    addQueue(q: QueueType) {
        this.queueMap.set(q, false)
        setTimeout(this.recursiveNode(q))
    }

    removeQueue(q: QueueType) {
        this.queueMap.set(q, true)
    }

    private recursiveNode(q: QueueType): () => void {
        return () => {
            if(this.queueMap.get(q) === true){
                this.queueMap.delete(q);
                return;
            }
            waitUntil(() => q.shouldRead || this.queueMap.get(q) === true)
            .then(() => {
                if(this.queueMap.get(q) === true){
                    this.queueMap.delete(q)
                    throw new Error()
                }
            })
            .then(() => q.queue.dequeue())
            .then(v => {
                return q.callback(v);
            }).then(sleepMs => {
                setTimeout(this.recursiveNode(q), sleepMs)
            }) 
            // ignore errors
            .catch(() => {})
        }
    }
}

export {QueueLoop}