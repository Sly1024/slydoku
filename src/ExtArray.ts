class ExtArray<T> extends Array<T> {
    remove(item:T) {
        this.removeAt(this.indexOf(item));
    }
    removeAt(idx:number) {
        if (idx < 0) return;
        const last = this.pop();
        if (idx < this.length) this[idx] = last;
    }
    include(...items:T[]) {
        for (const item of items) if (!this.includes(item)) {
            this.push(item);
        }
    }
}

class ExtMap<K,V> extends Map<K,V> {
    constructor(private itemCreator:(key?:K) => V) {
        super();
    }
    getOrCreate(key:K):V {
        let v = this.get(key);
        if (!v) {
            this.set(key, v = this.itemCreator(key));
        }
        return v;
    }
}