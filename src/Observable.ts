type EventHandler = (data?:any) => void;

class Observable {
    private events:{[name:string]:EventHandler[]} = {};
    
    on(event:string, handler:EventHandler) {
        (this.events[event] || (this.events[event] = [])).push(handler);
    }
    
    off(event:string, handler:EventHandler) {
        const list = this.events[event];
        if (list) {
            const idx = list.indexOf(handler);
            if (idx >= 0) list.splice(idx, 1);
        }
    }

    emit(event:string, ...args:any[]) {
        const list = this.events[event];
        if (list) list.forEach(handler => handler.apply(this, args));
    }
}

type ObserverDescriptor = {source:Observable, handler:EventHandler, observerFn:EventHandler, active:boolean};

class Observer {
    private events = new ExtMap<string, ExtArray<ObserverDescriptor>>(() => new ExtArray<ObserverDescriptor>());

    observe(event:string, source:Observable, handler:EventHandler) {
        const descriptor: ObserverDescriptor = { 
            source, handler, active: true, 
            observerFn: (...args) => { if (descriptor.active) descriptor.handler.apply(source, args); } 
        };
        source.on(event, descriptor.observerFn);
        this.events.getOrCreate(event).push(descriptor);
    }

    unobserve(event:string, source:Observable) {
        const list = this.events.getOrCreate(event);
        for (let i = 0; i < list.length;) {
            const desc = list[i];
            if (desc.source === source) {
                desc.source.off(event, desc.observerFn);
                list.removeAt(i);
            } else ++i;
        }
    }

    observeAndCall(source:Observable, target:any, ...events:string[]) {
        for (const event of events) {
            this.observe(event, source, target[event].bind(target));
        }
    }

    suspend(event:string, source?:Observable) {
        for (const desc of this.events.getOrCreate(event)) {
            if (!source || source === desc.source) desc.active = false;
        }
    }

    resume(event:string, source?:Observable) {
        for (const desc of this.events.getOrCreate(event)) {
            if (!source || source === desc.source) desc.active = true;
        }
    }

    destroy() {
        for (const [event, list] of this.events) {
            for (const {source, observerFn} of list) {
                source.off(event, observerFn);
            }
        }
        this.events = null;
    }
}