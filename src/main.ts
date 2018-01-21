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

let generator = new Generator($('#container'));
let game:Game = new Game($('#container'));

const loadSelect = $('#loadTable');

Object.keys(sampleTables).forEach(key => loadSelect.options.add(new Option(key, key)));
loadSelect.addEventListener('change', () => {
    game.loadTable(sampleTables[loadSelect.value]);
    console.log(`Loaded "${loadSelect.value}."`);
});

loadSelect.value = 'generated_hard';
loadSelect.dispatchEvent(new Event('change'))

$('#validateBtn').addEventListener('click', () => game.board.checkValidity());

$('#undoBtn').addEventListener('click', () => {
    game.history.undoLastStep();
    game.render();
});
$('#nextBtn').addEventListener('click', () => game.board.runRulesForNextStep(rules));

$('#backtrackBtn').addEventListener('click', () => {
    let solutions, calls;
    let time = measure(() => {
        let solver = game.solver;
        solutions = solver.solve();    
        calls = solver.callCounter;
    });
    console.log('solutions: ', solutions, 'in', time, 'ms', calls, 'calls');
    game.render();
});

$('#generateBtn').addEventListener('click', () => {
    let time = measure(() => {
        game = generator.generate(rules);
    });
    console.log('generated in', time, 'ms;', game.board.numCellsSolved, 'clues');
    game.render();
});

$('#rulesAndSolveBtn').addEventListener('click', () => {
    let solutions, calls;
    let time = measure(() => {
        game.board.runRulesUntilDone(rules);
        let solver = game.solver;
        solutions = solver.solve();    
        calls = solver.callCounter;
    });
    console.log('solutions: ', solutions, 'in', time, 'ms', calls, 'calls');
    game.render();
});