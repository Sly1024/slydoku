/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />
/// <reference path="Observable.ts" />

class CellsByCandidateCount extends Array<ExtArray<number>> {
    
    private observer:Observer = new Observer();

    constructor (private board:Board) {
        super();
        for (let i = 0; i < 10; ++i) this[i] = new ExtArray<number>();
        this.fillTable();
        this.observer.observeAndCall(board, this, 'candidatesChanged', 'cellSet', 'cellUnset');
    }

    fillTable() {
        const candidatesTable = this.board.candidatesTable;
        let i;
        for (i = 0; i < 81; ++i) if (!this.board.table[i]) this[candidatesTable[i].count].push(i);
    }

    candidatesChanged(cell:number, oldCandidates:Candidates, newCandidates:Candidates) {
        this[oldCandidates.count].remove(cell);
        this[newCandidates.count].push(cell);
    }

    cellSet(cell:number, digit:number, oldCandidates:Candidates) {
        // when this event is fired, the candidatesTable still contains the unchanged value (count)
        this[oldCandidates.count].remove(cell);
    }

    cellUnset(cell:number, digit:number, newCandidates:Candidates) {
        // when this event is fired, the candidatesTable contains the new value (count)
        this[newCandidates.count].push(cell);
    }

    destroy() {
        this.observer.destroy();
    }
}