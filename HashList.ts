class HashList<T> {
    public list:T[] = [];
    private idxs = {};

    push(item:T) {
        this.idxs[item.toString()] = this.list.length;
        this.list.push(item);
    }

    pop():T {
        const value:T = this.list.pop();
        this.idxs[value.toString()] = -1;
        return value;
    }

    remove(item:T) {
        const idx = this.idxs[item.toString()];
        this.idxs[item.toString()] = -1;
        const last:T = this.list.pop();
        if (idx < this.list.length) {
            this.list[idx] = last;
            this.idxs[last.toString()] = idx;
        }
    }
}