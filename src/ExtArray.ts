class ExtArray<T> extends Array<T> {
    remove (item:T) {
        const idx = this.indexOf(item);
        const last = this.pop();
        if (idx < this.length) this[idx] = last;
    }
}