/// <reference path="Board.ts" />
/// <reference path="BacktrackSolver.ts" />
/// <reference path="CandidatePositions.ts" />
/// <reference path="BoardHistory.ts" />

class Game {
    public board: Board;
    public history: BoardHistory;
    public solver: BacktrackSolver;
    public cellsByCandidateCount: CellsByCandidateCount;
    public candidatePositions: CandidatePositions;

    constructor(private container:HTMLElement) {
        this.loadTable();
    }

    loadTable(table?:string|number[]) {
        this.board = new Board(table);
        this.history = new BoardHistory(this.board);
        this.cellsByCandidateCount = new CellsByCandidateCount(this.board);
        this.candidatePositions = new CandidatePositions(this.board);
        this.solver = new BacktrackSolver(this);
        this.render(this.container);
    }

    render(container?:HTMLElement) {
        this.board.render(this.container = container || this.container);
    }

    destroy() {
        this.cellsByCandidateCount.destroy();
    }
}