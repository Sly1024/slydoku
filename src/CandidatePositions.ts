/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />

class CandidatePositions {
    
    public byCount:ExtArray<number>[] = [];

    // key = blockTypeIdx*81 + blockIdx*9 + digit-1
    public positions:ExtArray<number>[];

    constructor(private board:Board) {
        this.fillTable();
    }

    fillTable() {
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
}