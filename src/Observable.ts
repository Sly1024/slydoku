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

    emit(event:string, data?:any) {
        const list = this.events[event];
        if (list) list.forEach(handler => handler(data));
    }
}

class Observer {
    private subscriptions:[Observable, string, EventHandler][] = [];

    observe(host:Observable, event:string, handler:EventHandler) {
        this.subscriptions.push([host, event, handler]);
        host.on(event, handler);
    }

    unobserve(host?:Observable, event?:string) {
        this.subscriptions = this.subscriptions.filter(([s_host, s_event, handler]) => 
            ((!host || host === s_host) && (!event || event === s_event)) ? host.off(event, handler) : true
        );
    }
}