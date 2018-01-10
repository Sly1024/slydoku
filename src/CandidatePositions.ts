/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />

class CandidatePositions {
    
    public byCount:ExtArray<number>[] = [];

    // key = blockTypeIdx*81 + blockIdx*9 + digit-1
    public positions:ExtArray<number>[];

    private observer: Observer = new Observer();

    constructor(private board:Board) {
        this.fillTable();
        this.observer.observe(board, 'candidatesChanged', this.candidatesChanged.bind(this));
        this.observer.observe(board, 'cellSet', this.cellSet.bind(this));
        this.observer.observe(board, 'cellUnset', this.cellUnset.bind(this));
    }

    private fillTable() {
        const candidates = this.board.candidatesTable;
        const positions = this.positions = Array.from(Array(3*9*9), ()=>new ExtArray());

        let idx = 0;
        for (let btIdx = 0; btIdx < 3; ++btIdx) {   // block types
            const {blocks} = blockTypes[btIdx];
            for(let blockIdx = 0; blockIdx < 9; ++blockIdx, idx += 9) {
                for (const cell of blocks[blockIdx]) {
                    for (const digit of candidates[cell]) {
                        positions[idx+digit-1].push(cell);
                    }
                }
            }
        }
        const byCount = this.byCount = Array.from(Array(10), ()=>new ExtArray());
        for (let i = 0; i < positions.length; ++i) {
            byCount[positions[i].length].push(i);
        }
    }

    candidatesChanged(cell:number, oldCandidates:Candidates, newCandidates:Candidates) {
        const changedBits = oldCandidates.bits ^ newCandidates.bits;
        const added = oldCandidates.count < newCandidates.count;
        const digits = [...Candidates.prototype[Symbol.iterator].call({bits:changedBits})];

        for (let btIdx = 0, keyBtPre = 0; btIdx < 3; ++btIdx, keyBtPre += 81) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const keyPre = keyBtPre+bIdx*9;

            for (const digit of digits) {
                const htKey = keyPre + digit-1;
                const list = this.positions[htKey];
                this.byCount[list.length].remove(htKey);
                if (added) list.push(cell); else list.remove(cell);
                this.byCount[list.length].push(htKey);
            }
        }
    }

    cellSet(cell:number, digit:number, oldCandidates:Candidates) {
        this.candidatesChanged(cell, oldCandidates, new Candidates(0, 0));
    }

    cellUnset(cell:number, digit:number, newCandidates:Candidates) {
        this.candidatesChanged(cell, new Candidates(0, 0), newCandidates);
    }

    destroy() {
        this.observer.unobserve();
    }
}