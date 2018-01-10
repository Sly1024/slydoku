/// <reference path="Board.ts" />
/// <reference path="Rule.ts" />
/// <reference path="Game.ts" />

class Generator {
    constructor(private container:HTMLElement) {
    }

    private game:Game;

    generate(rules:Rule[]):Game {
        this.game = new Game(this.container);

        this.tryAddNextClue();
        // this.tryRemoveClues();
        return this.game;
    }

    tryAddNextClue() {
        const solver = this.game.solver;
        const candidatesTable = this.game.board.candidatesTable;
        for (let cnum = 9; cnum >= 1; --cnum) {
            if (this.game.cellsByCandidateCount[cnum].length === 0) continue;
            const cells = solver.cellsByCandidateCnt[cnum].slice();
            this.randomizePermutation(cells);
            for (const cell of cells) {
                const candidates = [...candidatesTable[cell]];
                this.randomizePermutation(candidates);
                for (const candidate of candidates) {
                    solver.setCell(cell, candidate);
                    const solutions = solver.solve();
                    if (solutions === 1) return true;
                    if (solutions > 1) {
                        if (this.tryAddNextClue()) return true;
                    }
                    solver.unSetCell(cell);
                }
            }
        }
    }

    // tryRemoveClues() {
    //     const board = this.board;
    //     const solver = this.solver;
    //     const cellsToRemove = [];

    //     for (let cell = 0; cell < 81; ++cell) {
    //         if (board.table[cell]) {
    //             cellsToRemove.push([cell, Candidates.bitcount(board.modifiedCandidates[cell])]);
    //         }
    //     }

    //     cellsToRemove.sort((a, b) => a[1] - b[1]);

    //     for (const [cell, candidateCount] of cellsToRemove) {
    //         const modified = solver.clearCell(cell);
    //         const solutions = solver.solve();
    //         if (solutions !== 1) {
    //             solver.unClearCell(cell, modified);            
    //         }
    //     }
    // }

    randomizePermutation(array:any[]) {
        for (let i = array.length; i > 1; ) {
            const rIdx = Math.random()*i|0;
            if (rIdx < --i) {
                const tmp = array[rIdx];
                array[rIdx] = array[i];
                array[i] = tmp;
            }
        }
    }

}