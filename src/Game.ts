/// <reference path="Board.ts" />
/// <reference path="BacktrackSolver.ts" />
/// <reference path="CandidatePositions.ts" />

class Game {
    public board: Board;
    public solver: BacktrackSolver;
    public cellsByCandidateCount: CellsByCandidateCount;
    public candidatePositions: CandidatePositions;

    constructor(private container:HTMLElement) {
        this.loadTable();
    }

    loadTable(table?:string|number[]|Board) {
        this.board = new Board(table);
        this.cellsByCandidateCount = new CellsByCandidateCount(this.board);
        this.candidatePositions = new CandidatePositions(this.board);
        this.solver = new BacktrackSolver(this.board, this.cellsByCandidateCount, this.candidatePositions);
        this.render(this.container);
    }

    render(container?:HTMLElement) {
        this.board.render(this.container = container || this.container);
    }

    destroy() {
        this.cellsByCandidateCount.destroy();
    }
}