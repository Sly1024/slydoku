/// <reference path="Board.ts" />
/// <reference path="sampleTables.ts" />
/// <reference path="Rule.ts" />
/// <reference path="Generator.ts" />
/// <reference path="BacktrackSolver.ts" />

// some polyfill/helper stuff
const $ = (s) => document.querySelector(s);

const measure = (fn) => {
    let time = performance.now();
    fn();
    return performance.now() - time;
}

let board = new Board(table2);
board.render($('#container'));

$('#validateBtn').addEventListener('click', () => board.checkValidity());

$('#nextBtn').addEventListener('click', () => board.runRulesForNextStep(rules));

$('#backtrackBtn').addEventListener('click', () => {
    // let board2 = new Board(board);
    let solutions;
    let time = measure(() => {
        let solver = new BacktrackSolver(board);
        solutions = solver.solve();    
    });
    console.log('solutions: ', solutions, 'in', time, 'ms');
    board.render($('#container'));
});

$('#generateBtn').addEventListener('click', () => {
    let generator = new Generator($('#container'));
    let time = measure(() => {
        board = generator.generateBoard(rules);
    });
    console.log('generated in', time, 'ms;', board.numCellsSolved, 'clues');
    board.render($('#container'));
});

