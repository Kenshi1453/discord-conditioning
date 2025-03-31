interface SourceEventListener{
    notify(id: string, mess: string): void;
}


interface Source{
    addListener(listener: SourceEventListener): void;
    removeListener(listener: SourceEventListener): void;
    destroy(): void;
}

// Make it abstract so we can't initialize it 
abstract class AbstractSource implements Source{
    private listeners: SourceEventListener[];
    
    constructor(){
        this.listeners = [];
    }

    addListener(listener: SourceEventListener): void {
        this.listeners.push(listener)
    }
    removeListener(listener: SourceEventListener): void {
        const index = this.listeners.indexOf(listener)
        if(index > -1){
            this.listeners.splice(index, 1)
        }
    }

    broadcastMessage(id: string, mess: string){
        for(const listener of this.listeners){
            listener.notify(id, mess);
        }
    }

    abstract destroy(): void;
}

export {Source, SourceEventListener, AbstractSource}