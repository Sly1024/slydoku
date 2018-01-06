/// <reference path="Board.ts" />
/// <reference path="BlockType.ts" />
/// <reference path="ExtArray.ts" />

class BacktrackSolver {
    // cells grouped by candidate count
    public cellsByCandidateCnt:ExtArray<number>[];

    // tuples<blockType, blockIdx, digit> grouped by occurrence count
    // key = blockTypeIdx*81 + blockIdx*9 + digit-1
    private hiddenTupleCount:number[];
    private hiddenTuplesByCnt:ExtArray<number>[];
    
    private candidatesChanged_Removed:CandidatesModifiedFn;
    private candidatesChanged_Added:CandidatesModifiedFn;

    constructor (private board:Board) {
        this.fillCountTables(board);
        this.candidatesChanged_Removed = this.candidatesChanged.bind(this, -1);
        this.candidatesChanged_Added = this.candidatesChanged.bind(this, 1);
    }

    fillCountTables(board:Board) {
        const cbcc = this.cellsByCandidateCnt = Array.from(Array(10), ()=>new ExtArray());
        for (let i = 0; i < 81; ++i) if (!board.table[i]) cbcc[board.candidatesTable[i].count].push(i);

        const htuples = this.hiddenTupleCount = Array(3*9*9).fill(0);
        let htIdx = 0;
        for (let btIdx = 0; btIdx < 3; ++btIdx) {   // block types
            const {blocks} = blockTypes[btIdx];
            for(let blockIdx = 0; blockIdx < 9; ++blockIdx, htIdx += 9) {
                for (const cell of blocks[blockIdx]) {
                    for (const digit of board.candidatesTable[cell]) {
                        ++htuples[htIdx+digit-1];
                    }
                }
            }
        }
        const htuplesByCnt = this.hiddenTuplesByCnt = Array.from(Array(10), ()=>new ExtArray());
        for (let i = 0; i < htuples.length; ++i) {
            htuplesByCnt[htuples[i]].push(i);
        }
    }

    setCell(cell:number, digit:number) {
        const count = this.board.candidatesTable[cell].count;
        this.removeCellFromCBCC(cell, count);
        this.updateHiddenTupleCountForCell(cell, -1);
        this.board.setCell(cell, digit, this.candidatesChanged_Removed);
    }

    unSetCell(cell:number) {
        this.board.unSetCell(cell, this.candidatesChanged_Added);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCountForCell(cell, 1);
    }

    clearCell(cell:number) {
        const modified = this.board.clearCell(cell, this.candidatesChanged_Added);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCountForCell(cell, 1);
        return modified;
    }

    unClearCell(cell:number, modified:number) {
        const count = this.board.candidatesTable[cell].count;
        this.removeCellFromCBCC(cell, count);
        this.updateHiddenTupleCountForCell(cell, -1);
        this.board.unClearCell(cell, modified, this.candidatesChanged_Removed);
    }

    private solutionCount:number;
    public callCounter:number;

    solve() {
        this.callCounter = 0;
        this.solutionCount = 0;
        this.solveNextCell();
        //console.log('callCounter:', this.callCounter, 'solutions:', this.solutionCount);
        return this.solutionCount;
    }

    private solveNextCell(cnum = 0) {
        if (++this.callCounter > 1000) {    // to avoid very long solve times...
            this.solutionCount = -1;
            return;
        }

        while (cnum <= 9 && this.cellsByCandidateCnt[cnum].length === 0) cnum++;
        if (cnum === 0) return; // there is a cell with 0 candidates => no solution
        if (cnum === 10) {
            this.solutionCount++;
            return;
        }

        let htnum = 1;
        while (htnum <= 9 && this.hiddenTuplesByCnt[htnum].length === 0) htnum++;

        if (cnum <= htnum) {
            const cell = this.cellsByCandidateCnt[cnum].pop();
            this.updateHiddenTupleCountForCell(cell, -1);
            for (const digit of this.board.candidatesTable[cell]) {
                this.board.setCell(cell, digit, this.candidatesChanged_Removed);
                this.solveNextCell(cnum-1);
                this.board.unSetCell(cell, this.candidatesChanged_Added);
                if (this.solutionCount > 1) break;
            }
            this.updateHiddenTupleCountForCell(cell, 1);
            this.cellsByCandidateCnt[cnum].push(cell);
        } else {
            const htKey = this.hiddenTuplesByCnt[htnum][0];
            const digit = (htKey % 9) + 1;
            const bIdx = (htKey/9|0) % 9;
            const btIdx = htKey/81|0;
            const bitmask = 1<<digit-1;

            for (const cell of blockTypes[btIdx].blocks[bIdx]) {
                if (this.board.candidatesTable[cell].bits & bitmask) {
                    this.removeCellFromCBCC(cell, this.board.candidatesTable[cell].count);
                    this.updateHiddenTupleCountForCell(cell, -1);

                    this.board.setCell(cell, digit, this.candidatesChanged_Removed);
                    this.solveNextCell(cnum-1);
                    this.board.unSetCell(cell, this.candidatesChanged_Added);

                    this.updateHiddenTupleCountForCell(cell, 1);
                    this.addCellToCBCC(cell);
                    
                    if (this.solutionCount > 1) break;
                }
            }
        }
    }

    private removeCellFromCBCC(cell:number, count:number) {
        this.cellsByCandidateCnt[count].remove(cell);
    }

    private addCellToCBCC(cell:number) {
        const newCnt = this.board.candidatesTable[cell].count;
        this.cellsByCandidateCnt[newCnt].push(cell);
    }

    private updateHiddenTupleCount(cell:number, digit:number, delta:number) {
        for (let btIdx = 0; btIdx < 3; ++btIdx) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const htKey = btIdx*81+bIdx*9+digit-1;

            this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey]].remove(htKey);
            this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey] += delta].push(htKey);
        }
    }

    private updateHiddenTupleCountForCell(cell:number, delta:number) {
        // does: for (const candidate of this.board.candidatesTable[cell]) this.updateHiddenTupleCount(cell, candidate, delta);
        const candidates = this.board.candidatesTable[cell];
        for (let btIdx = 0, htKeyBtPre = 0; btIdx < 3; ++btIdx, htKeyBtPre += 81) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const htKeyPre = htKeyBtPre+bIdx*9;

            for (const candidate of candidates) {
                const htKey = htKeyPre + candidate-1;
                this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey]].remove(htKey);
                this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey] += delta].push(htKey);
            }
        }
    }
    
    private candidatesChanged(delta:number, cell:number, oldCnt:number, digit:number) {
        this.removeCellFromCBCC(cell, oldCnt);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCount(cell, digit, delta);
    }
}