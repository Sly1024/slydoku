/// <reference path="Board.ts" />
/// <reference path="BacktrackSolver.ts" />
/// <reference path="CandidatePositions.ts" />
/// <reference path="BoardHistory.ts" />
/// <reference path="Rule.ts" />

class Game {
    public board: Board;
    public history: BoardHistory;
    public solver: BacktrackSolver;
    public cellsByCandidateCount: CellsByCandidateCount;
    public candidatePositions: CandidatePositions;

    constructor(private container:HTMLElement, private rules:Rule[]) {
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

    runRule(ruleFn:RuleFn) {
		const results = ruleFn(this);
		if (results) {
			for (const step of results) {
                this.board.applySolveStep(step);
			}
			this.board.emit('stepDone');
		}
		return results;
    }
    
    runRulesForNextStep() {
		for (const rule of this.rules) {
			const results = this.runRule(rule.fn);
			if (results) {
				console.log(rule.name + ' - ' + results.join(';') + ' solved: ' + this.board.numCellsSolved);
				this.render();
				return;
			}
		}
		console.log('No rule matched');
    }
    
    runRulesUntilDone() {
        for (let i = 0; i < this.rules.length;) {
            if (this.runRule(this.rules[i].fn)) {
                if (this.board.numCellsSolved === 81) return;
                i = 0;
            } else {
                ++i;
            }
        }
    }

    destroy() {
        this.cellsByCandidateCount.destroy();
    }
}