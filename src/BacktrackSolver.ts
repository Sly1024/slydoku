/// <reference path="Board.ts" />
/// <reference path="BlockType.ts" />
/// <reference path="ExtArray.ts" />
/// <reference path="CellsByCandidateCount.ts" />


class BacktrackSolver {

    constructor (private game:Game) {
    }

    // clearCell(cell:number) {
    //     const modified = this.board.clearCell(cell, this.candidatesChanged_Added);
    //     this.updateHiddenTupleCountForCell(cell, 1);
    //     return modified;
    // }

    // unClearCell(cell:number, modified:number) {
    //     const count = this.board.candidatesTable[cell].count;
    //     this.updateHiddenTupleCountForCell(cell, -1);
    //     this.board.unClearCell(cell, modified, this.candidatesChanged_Removed);
    // }

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
        
        const game = this.game;

        while (cnum <= 9 && game.cellsByCandidateCount[cnum].length === 0) cnum++;
        if (cnum === 0) return; // there is a cell with 0 candidates => no solution
        if (cnum === 10) {
            this.solutionCount++;
            return;
        }

        let pnum = 1;
        while (pnum <= 9 && game.candidatePositions.byCount[pnum].length === 0) pnum++;

        if (cnum <= pnum) {
            const cell = game.cellsByCandidateCount[cnum][0];
            for (const digit of game.board.candidatesTable[cell]) {
                game.board.setCell(cell, digit);
                this.solveNextCell(cnum-1);
                game.history.undoLastStep();
                if (this.solutionCount > 1) break;
            }
            // this.cellsByCandidateCnt[cnum].push(cell);
        } else {
            const pKey = game.candidatePositions.byCount[pnum][0];
            const digit = (pKey % 9) + 1;
            const bIdx = (pKey/9|0) % 9;
            const btIdx = pKey/81|0;
            const bitmask = 1<<digit-1;

            for (const cell of blockTypes[btIdx].blocks[bIdx]) {
                if (game.board.candidatesTable[cell].bits & bitmask) {
                    game.board.setCell(cell, digit);
                    this.solveNextCell(cnum-1);
                    game.history.undoLastStep();
                    
                    if (this.solutionCount > 1) break;
                }
            }
        }
    }
}