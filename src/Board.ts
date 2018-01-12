/// <reference path="Candidates.ts" />
/// <reference path="BlockType.ts" />
/// <reference path="SolveStep.ts" />
/// <reference path="Observable.ts" />
/// <reference path="BoardHistory.ts" />


type RuleFn = (board:Board) => SolveStep[];

class Board extends Observable {

    public table: number[];
    private container: HTMLElement;
    public candidatesTable: Candidates[];
	public numCellsSolved:number;
	public modifiedCandidates:number[];
	public history:BoardHistory;

	constructor(board?:string|number[]|Board) {
		super();
        if (board instanceof Board) {
			this.table = board.table.slice();
			this.container = board.container;
			this.candidatesTable = board.candidatesTable.map(candi => candi.clone());
			this.numCellsSolved = board.numCellsSolved;
			this.history = board.history.clone(this);
        } else {
			this.table = this.checkTableErrors(board) || Array(9*9).fill(0);
			this.calcCandidates();
			this.history = new BoardHistory(this);
        }
	}

	private checkTableErrors(table) {
		if (!table) return;
		if (typeof table === 'string') {
			table = table.replace(/[^\d]/g, '').split('').map(d => parseInt(d, 10));
		}
		if (table.length !== 9*9) throw new Error(`Invalid number of elements: ${table.length}`);
		for (const digit of table) {
			if (typeof digit !== 'number') throw new Error(`Not a number: ${digit}`);
			if ((digit|0) !== digit) throw new Error(`Not an integer: ${digit}`);
			if (digit < 0 || digit > 9) throw new Error(`Invalid digit: ${digit}`);
		}
		return table;
    }
    
    isSolved() {
        return this.numCellsSolved === 81;
    }
	
	render(container:HTMLElement = this.container) {
		(this.container = container).innerHTML = 
			this.renderTable(9, 9, 'main', (i) => this.renderCell(i));
	}
	
	private renderTable(rownum:number, colnum:number, className:string, renderCellFn:(idx:number, row:number, col:number) => string) {
		let html = `<table class="${className}"><tbody>`;
		let idx = 0;
		for (let row = 0; row < rownum; ++row) {
			html += '<tr>';
			for (let col = 0; col < colnum; ++col) {
				html += '<td>' + renderCellFn(idx++, row, col) + '</td>';
			}
			html += '</tr>';
		}
		html += '</tbody></table>';
		return html;
	}
	
	private renderCell(idx:number) {
		const value = this.table[idx];
		if (value) return '<div class="solved">' + value + '</div>';
		
		const {bits} = this.candidatesTable[idx];
		return this.renderTable(3, 3, 'candidates', (i) => bits & (1<<i) ? (i+1).toString() : '&nbsp;');
	}
	
	checkValidity() {
		const errors = [];
		for (const {name, blocks} of blockTypes) for (const block of blocks) this.checkForDuplicate(block, name, errors);
		
		if (errors.length === 0) {
			alert('OK');
		} else {
			alert(JSON.stringify(errors));
		}
	}
	
	private checkForDuplicate(cells:number[], name:string, errors:any[]) {
		const digits = {};
		for (const cell of cells) {
			const digit = this.table[cell];
			if (digit) {
				if (digits[digit]) {
					errors.push([name, cell]);
					return;
				}
				digits[digit] = 1;	// any truthy value
			}
		}
	}
	
	private calcCandidates() {
        this.numCellsSolved = 0;
		// candidatesTable[cell] = { count: number of available candidates, bits: bitmask of which digits are available (1<<digit-1) }
		this.candidatesTable = Array(9*9).fill(0).map((_, cell) => this.table[cell] ? (this.numCellsSolved++, new Candidates(0, 0)) : new Candidates(9, 0x1ff));
		for (const {blocks} of blockTypes) for (const block of blocks) {
			let bitmask = 0;
			for (const cell of block) bitmask |= 1 << this.table[cell];
			bitmask >>= 1;
			for (const cell of block) this.candidatesTable[cell].removeBits(bitmask); 
		}
	}
	
	changeCandidate(cell:number, bitmask:number, add:boolean) {
		const candidates = this.candidatesTable[cell];
		const old = candidates.clone();
		if (candidates[add ? 'addBits' : 'removeBits'](bitmask)) {
			this.emit('candidatesChanged', cell, old, candidates, bitmask, add);
			return true;
		}
	}

	private removeCandidate(cell:number, bitmask:number) {
		return this.changeCandidate(cell, bitmask, false);
	}

	private addCandidate(cell:number, bitmask:number) {
		return this.changeCandidate(cell, bitmask, true);
	}

    applySolveStep({op, cell, digit}:SolveStep) {
		if (op === 's') {	// solve
			this.setCell(cell, digit);
        } else if (op === 'r') {	//remove
            this.removeCandidate(cell, digit);
        }
	}

	getAffectedCells(cell:number) {
		const rowIdx = row.getIdx(cell);
		const colIdx = col.getIdx(cell);
		const boxIdx = box.getIdx(cell);
		const affected:number[] = [];

		for (const bidx of row.blocks[rowIdx]) if (bidx !== cell) affected.push(bidx);
		for (const bidx of col.blocks[colIdx]) if (bidx !== cell) affected.push(bidx);
		for (const qidx of Candidates.boxQuad[rowIdx%3][colIdx%3]) affected.push(box.blocks[boxIdx][qidx]);

		return affected;
	}

	setCell(cell:number, digit:number) {
		this.table[cell] = digit;
		this.numCellsSolved++;

		const candidates = this.candidatesTable[cell];
		const bitmask = 1 << digit-1;
		this.emit('cellSet', cell, digit, candidates);

		for (const acell of this.getAffectedCells(cell)) {
			this.removeCandidate(acell, bitmask); 
		}

		candidates.solved();
		this.history.markStepDone();
	}
	
	unSetCell(cell:number, bits:number) {
		const digit = this.table[cell];
		this.table[cell] = 0;
		this.numCellsSolved--;

		const candidates = this.candidatesTable[cell];

		candidates.setBits(bits);
		this.emit('cellUnset', cell, digit, candidates);
	}

	// clearCell(cell:number, candidatesModified?:CandidatesModifiedFn) {
	// 	const digit = this.table[cell];
	// 	this.table[cell] = 0;

	// 	const affectedCells = this.getAffectedCells(cell);
	// 	const affectedCandidateCnts = affectedCells.map(cell => this.candidatesTable[cell].count);

	// 	this.calcCandidates();	// I don't know any faster way... If you do, let me know!

	// 	const bitmask = 1<<digit-1;
	// 	let modified = 0, modBit = 1;

	// 	for (let i = 0; i < affectedCells.length; ++i) {
	// 		const acell = affectedCells[i];
	// 		const oldCnum = affectedCandidateCnts[i];

	// 		if (this.candidatesTable[acell].count !== oldCnum) { 
	// 			modified |= modBit; 
	// 			if (candidatesModified) candidatesModified(acell, oldCnum, digit);
	// 		}
			
	// 		modBit <<= 1; 
	// 	}
	// 	this.modifiedCandidates[cell] = 0;	// 
	// 	return modified | (digit << 20);
	// }

	// unClearCell(cell:number, modified:number, candidatesModified?:CandidatesModifiedFn) {
	// 	const digit = modified >> 20;
	// 	this.table[cell] = digit;
	// 	this.numCellsSolved++;

	// 	const bitmask = 1<<digit-1;

	// 	for (const acell of this.getAffectedCells(cell)) {
	// 		if (modified&1) {
	// 			const oldCnum = this.candidatesTable[acell].count;
	// 			this.removeCandidate(acell, bitmask);
	// 			if (candidatesModified) candidatesModified(acell, oldCnum, digit);
	// 		}
	// 		modified >>= 1;
	// 	}

	// 	this.candidatesTable[cell].solved();
	// }

	runRule(ruleFn:RuleFn) {
		const results = ruleFn(this);
		if (results) {
			for (const step of results) {
                this.applySolveStep(step);
			}
			this.history.markStepDone();
		}
		return results;
	}
	
	runRulesForNextStep(rules:Rule[]) {
		for (const rule of rules) {
			const results = this.runRule(rule.fn);
			if (results) {
				console.log(rule.name + ' - ' + results.join(';') + ' solved: ' + this.numCellsSolved);
				this.render();
				return;
			}
		}
		console.log('No rule matched');
	}

    getEmptyCells() {
        const cells = [];
        for (let idx = 0; idx < 81; ++idx) if (this.table[idx] === 0) cells.push(idx);
        return cells;
    }

    runRulesUntilDone(rules:Rule[]) {
        for (let i = 0; i < rules.length;) {
            if (this.runRule(rules[i].fn)) {
                if (this.numCellsSolved === 81) return;
                i = 0;
            } else {
                ++i;
            }
        }
    }

    areCandidatesValid():boolean {
        for (let i = 0; i < 81; ++i) {
            if (!this.table[i] && !this.candidatesTable[i].count) return false;
        }
        return true;
	}
	
}