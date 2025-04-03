
class PromiseWithResolvers<T>{
    promise: Promise<T>;
    resolve!: ((arg0: T) => void);
    reject!: (arg0: any) => void;

    constructor(){
        /** @type {Promise<T>} */
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        })
    }
}

class AsyncQueue<T> implements AsyncIterator<T> {
    private list: T[];
    private promise: PromiseWithResolvers<T>;
    private waiting_for_promise: boolean;

    constructor(){
        this.list = []
        this.promise = new PromiseWithResolvers<T>()
        this.waiting_for_promise = false
    }


    async enqueue(item: T){
        if(this.waiting_for_promise){
            this.waiting_for_promise = false;
            this.promise.resolve(item)
            this.promise = new PromiseWithResolvers<T>()
        }else{
            this.list.push(item)
        }
    }

    async dequeue(): Promise<T>{
        if(this.list.length > 0){
            return this.list.shift()!
        }else{
            this.waiting_for_promise = true
            return this.promise.promise
        }
    }

    getCurrentState(){
        return [...this.list]
    }

    async next(...[_]: [] | [any]): Promise<IteratorResult<T, any>> {
        const v = await this.dequeue();
        return { value: v, done: false };
    }
}

export { AsyncQueue }