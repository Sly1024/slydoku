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

let board:Board;

const loadSelect = $('#loadTable');

Object.keys(sampleTables).forEach(key => loadSelect.options.add(new Option(key, key)));
loadSelect.addEventListener('change', () => {
    board = new Board(sampleTables[loadSelect.value]);
    board.render($('#container'));
    console.log(`Loaded "${loadSelect.value}."`);
});

loadSelect.value = 'generated_hard';
loadSelect.dispatchEvent(new Event('change'))

$('#validateBtn').addEventListener('click', () => board.checkValidity());

$('#nextBtn').addEventListener('click', () => board.runRulesForNextStep(rules));

$('#backtrackBtn').addEventListener('click', () => {
    let solutions, calls;
    let time = measure(() => {
        let solver = new BacktrackSolver(board);
        solutions = solver.solve();    
        calls = solver.callCounter;
    });
    console.log('solutions: ', solutions, 'in', time, 'ms', calls, 'calls');
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

$('#rulesAndSolveBtn').addEventListener('click', () => {
    let solutions, calls;
    let time = measure(() => {
        board.runRulesUntilDone(rules);
        let solver = new BacktrackSolver(board);
        solutions = solver.solve();    
        calls = solver.callCounter;
    });
    console.log('solutions: ', solutions, 'in', time, 'ms', calls, 'calls');
    board.render($('#container'));
});