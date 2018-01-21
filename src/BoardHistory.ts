/// <reference path="Board.ts" />

type RecordEntry = ['c'|'s', number, number, boolean];

class BoardHistory {
    private steps:RecordEntry[][] = [];
    private recorded:RecordEntry[] = [];

    private observer: Observer = new Observer();

    constructor(private board:Board) {
        this.observer.observeAndCall(board, this, 'candidatesChanged', 'cellSet', 'stepDone');
    }

    candidatesChanged(cell:number, oldC:Candidates, newC:Candidates, bitmask:number, add:boolean) {
        this.recorded.push(['c', cell, bitmask, add]);
    }

    cellSet(cell:number, digit:number, oldC:Candidates) {
        this.recorded.push(['s', cell, oldC.bits, false]);
    }

    stepDone() {
        if (this.recorded.length) {            
            this.steps.push(this.recorded);
            this.recorded = [];
        }
    }

    undoLastStep() {        
        if (this.recorded.length) throw new Error('Still recording!');
        if (this.steps.length === 0) return;
        
        this.observer.suspend('candidatesChanged');

        for (const [op, cell, bits, add] of this.steps.pop().reverse()) {
            if (op === 's') {
                this.board.unSetCell(cell, bits);
            } else if (op === 'c') {
                this.board.changeCandidate(cell, bits, !add);
            }
        }

        this.observer.resume('candidatesChanged');
    }

    clone(board:Board):BoardHistory {
        const history = new BoardHistory(board);
        history.steps = this.steps.slice();
        return history;
    }
}