class Candidates {
    constructor(count, bits) {
        this.count = count;
        this.bits = bits;
    }
    solved() {
        this.count = this.bits = 0;
    }
    setBits(bits) {
        if (this.bits !== bits) {
            this.count = Candidates.bitcount(this.bits = bits);
            return true;
        }
        return false;
    }
    removeBits(bitmask) {
        return this.setBits(this.bits & ~bitmask);
    }
    addBits(bitmask) {
        return this.setBits(this.bits | bitmask);
    }
    static bitcount(n) {
        // http://gurmeet.net/puzzles/fast-bit-counting-routines/
        const tmp = n - ((n >> 1) & 0o33333333333) - ((n >> 2) & 0o11111111111);
        return ((tmp + (tmp >> 3)) & 0o30707070707) % 63;
    }
    *[Symbol.iterator]() {
        let digit = 1, bits = this.bits;
        while (bits) {
            if (bits & 1)
                yield digit;
            bits >>= 1;
            ++digit;
        }
    }
    getNthCandidate(n) {
        for (const digit of this) {
            if (n-- === 0)
                return digit;
        }
    }
    clone() {
        return new Candidates(this.count, this.bits);
    }
}
// for a given [y:0..2][x:0..2] = [array of 4 indices: if 0..8 are arranged in a 3x3, then the 4 that are not in row y and not in column x]
Candidates.boxQuad = [0, 1, 2].map(y => [0, 1, 2].map(x => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(v => v % 3 !== x && (v / 3 | 0) !== y)));
class BlockType {
    constructor(name, blocks, getIdx) {
        this.name = name;
        this.blocks = blocks;
        this.getIdx = getIdx;
    }
}
const fill9x9 = (fn) => Array.from(Array(9), (_, idx) => Array.from(Array(9), (_, cell) => fn(idx, cell)));
const row = new BlockType('row', fill9x9((i, c) => i * 9 + c), i => i / 9 | 0);
const col = new BlockType('col', fill9x9((i, c) => c * 9 + i), i => i % 9);
const box = new BlockType('box', fill9x9((i, c) => (i / 3 | 0) * 27 + (i % 3) * 3 + (c / 3 | 0) * 6 + c), i => (i / 27 | 0) * 3 + (i % 9) / 3 | 0);
const blockTypes = Object.assign([row, col, box], { row, col, box });
class SolveStep {
    constructor(op, cell, digit, blockName) {
        this.op = op;
        this.cell = cell;
        this.digit = digit;
        this.blockName = blockName;
    }
    toString() {
        return `${this.name} (${this.cell / 9 | 0}, ${this.cell % 9}) - ${this.getDigits()}${this.blockName ? ' in ' + this.blockName : ''}`;
    }
    getDigits() {
        return this.digit.toString();
    }
}
class Solve extends SolveStep {
    constructor(cell, digit, blockName) {
        super('s', cell, digit, blockName);
        this.cell = cell;
        this.digit = digit;
        this.blockName = blockName;
        this.name = 'Solve Cell';
    }
}
class Remove extends SolveStep {
    constructor(cell, digit, blockName) {
        super('r', cell, digit, blockName);
        this.cell = cell;
        this.digit = digit;
        this.blockName = blockName;
        this.name = 'Remove Candidate';
    }
    getDigits() {
        return '[' + [...new Candidates(0, this.digit)].join(',') + ']';
    }
}
class Observable {
    constructor() {
        this.events = {};
    }
    on(event, handler) {
        (this.events[event] || (this.events[event] = [])).push(handler);
    }
    off(event, handler) {
        const list = this.events[event];
        if (list) {
            const idx = list.indexOf(handler);
            if (idx >= 0)
                list.splice(idx, 1);
        }
    }
    emit(event, ...args) {
        const list = this.events[event];
        if (list)
            list.forEach(handler => handler.apply(this, args));
    }
}
class Observer {
    constructor() {
        this.events = new ExtMap(() => new ExtArray());
    }
    observe(event, source, handler) {
        const descriptor = {
            source, handler, active: true,
            observerFn: (...args) => { if (descriptor.active)
                descriptor.handler.apply(source, args); }
        };
        source.on(event, descriptor.observerFn);
        this.events.getOrCreate(event).push(descriptor);
    }
    unobserve(event, source) {
        const list = this.events.getOrCreate(event);
        for (let i = 0; i < list.length;) {
            const desc = list[i];
            if (desc.source === source) {
                desc.source.off(event, desc.observerFn);
                list.removeAt(i);
            }
            else
                ++i;
        }
    }
    observeAndCall(source, target, ...events) {
        for (const event of events) {
            this.observe(event, source, target[event].bind(target));
        }
    }
    suspend(event, source) {
        for (const desc of this.events.getOrCreate(event)) {
            if (!source || source === desc.source)
                desc.active = false;
        }
    }
    resume(event, source) {
        for (const desc of this.events.getOrCreate(event)) {
            if (!source || source === desc.source)
                desc.active = true;
        }
    }
    destroy() {
        for (const [event, list] of this.events) {
            for (const { source, observerFn } of list) {
                source.off(event, observerFn);
            }
        }
        this.events = null;
    }
}
/// <reference path="Candidates.ts" />
/// <reference path="BlockType.ts" />
/// <reference path="SolveStep.ts" />
/// <reference path="Observable.ts" />
class Board extends Observable {
    constructor(board) {
        super();
        if (board instanceof Board) {
            this.table = board.table.slice();
            this.container = board.container;
            this.candidatesTable = board.candidatesTable.map(candi => candi.clone());
            this.numCellsSolved = board.numCellsSolved;
        }
        else {
            this.table = this.checkTableErrors(board) || Array(9 * 9).fill(0);
            this.calcCandidates();
        }
    }
    checkTableErrors(table) {
        if (!table)
            return;
        if (typeof table === 'string') {
            table = table.replace(/[^\d]/g, '').split('').map(d => parseInt(d, 10));
        }
        if (table.length !== 9 * 9)
            throw new Error(`Invalid number of elements: ${table.length}`);
        for (const digit of table) {
            if (typeof digit !== 'number')
                throw new Error(`Not a number: ${digit}`);
            if ((digit | 0) !== digit)
                throw new Error(`Not an integer: ${digit}`);
            if (digit < 0 || digit > 9)
                throw new Error(`Invalid digit: ${digit}`);
        }
        return table;
    }
    isSolved() {
        return this.numCellsSolved === 81;
    }
    render(container = this.container) {
        (this.container = container).innerHTML =
            this.renderTable(9, 9, 'main', (i) => this.renderCell(i));
    }
    renderTable(rownum, colnum, className, renderCellFn) {
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
    renderCell(idx) {
        const value = this.table[idx];
        if (value)
            return '<div class="solved">' + value + '</div>';
        const { bits } = this.candidatesTable[idx];
        return this.renderTable(3, 3, 'candidates', (i) => bits & (1 << i) ? (i + 1).toString() : '&nbsp;');
    }
    checkValidity() {
        const errors = [];
        for (const { name, blocks } of blockTypes)
            for (const block of blocks)
                this.checkForDuplicate(block, name, errors);
        if (errors.length === 0) {
            alert('OK');
        }
        else {
            alert(JSON.stringify(errors));
        }
    }
    checkForDuplicate(cells, name, errors) {
        const digits = {};
        for (const cell of cells) {
            const digit = this.table[cell];
            if (digit) {
                if (digits[digit]) {
                    errors.push([name, cell]);
                    return;
                }
                digits[digit] = 1; // any truthy value
            }
        }
    }
    calcCandidates() {
        this.numCellsSolved = 0;
        // candidatesTable[cell] = { count: number of available candidates, bits: bitmask of which digits are available (1<<digit-1) }
        this.candidatesTable = Array(9 * 9).fill(0).map((_, cell) => this.table[cell] ? (this.numCellsSolved++, new Candidates(0, 0)) : new Candidates(9, 0x1ff));
        for (const { blocks } of blockTypes)
            for (const block of blocks) {
                let bitmask = 0;
                for (const cell of block)
                    bitmask |= 1 << this.table[cell];
                bitmask >>= 1;
                for (const cell of block)
                    this.candidatesTable[cell].removeBits(bitmask);
            }
    }
    changeCandidate(cell, bitmask, add) {
        const candidates = this.candidatesTable[cell];
        const old = candidates.clone();
        if (candidates[add ? 'addBits' : 'removeBits'](bitmask)) {
            this.emit('candidatesChanged', cell, old, candidates, bitmask, add);
            return true;
        }
    }
    removeCandidate(cell, bitmask) {
        return this.changeCandidate(cell, bitmask, false);
    }
    addCandidate(cell, bitmask) {
        return this.changeCandidate(cell, bitmask, true);
    }
    applySolveStep({ op, cell, digit }) {
        if (op === 's') {
            this.setCell(cell, digit);
        }
        else if (op === 'r') {
            this.removeCandidate(cell, digit);
        }
    }
    getAffectedCells(cell) {
        const rowIdx = row.getIdx(cell);
        const colIdx = col.getIdx(cell);
        const boxIdx = box.getIdx(cell);
        const affected = [];
        for (const bidx of row.blocks[rowIdx])
            if (bidx !== cell)
                affected.push(bidx);
        for (const bidx of col.blocks[colIdx])
            if (bidx !== cell)
                affected.push(bidx);
        for (const qidx of Candidates.boxQuad[rowIdx % 3][colIdx % 3])
            affected.push(box.blocks[boxIdx][qidx]);
        return affected;
    }
    setCell(cell, digit) {
        this.table[cell] = digit;
        this.numCellsSolved++;
        const candidates = this.candidatesTable[cell];
        const bitmask = 1 << digit - 1;
        this.emit('cellSet', cell, digit, candidates);
        for (const acell of this.getAffectedCells(cell)) {
            this.removeCandidate(acell, bitmask);
        }
        candidates.solved();
        this.emit('stepDone');
    }
    unSetCell(cell, bits) {
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
    getEmptyCells() {
        const cells = [];
        for (let idx = 0; idx < 81; ++idx)
            if (this.table[idx] === 0)
                cells.push(idx);
        return cells;
    }
    areCandidatesValid() {
        for (let i = 0; i < 81; ++i) {
            if (!this.table[i] && !this.candidatesTable[i].count)
                return false;
        }
        return true;
    }
}
const sampleTables = {
    SimpleTable: '040050070008000300300906004013509780000807000076104590200601007001000600090080020',
    table2: '050091000009037000100400000700000058000100027310080900007000030900500004080903600',
    table3: `
    070 008 900
    590 004 800
    000 007 014

    000 000 342
    000 000 000
    153 000 000

    630 100 000
    004 200 065
    005 900 080`,
    generated2: '050091000009037000100400000700000058000100027310080900007000030900500004080903600',
    generated4: '600000700530000004400000008054002000000005070002006030000304980049168000000709640',
    generated_hard: '004000007080004050071002000907000000000160000000000045100030600000600300020000080',
    nakedtriple: '600802735702356940300407062100975024200183079079624003400560207067240300920738406',
    hiddentriple: '500620037004890000000050000930000000020000605700000003000009000000000700680570002',
    xwing: '041729030769003402032640719403900170607004903195370024214567398376090541958431267',
    xwing2: '980062753065003000327050006790030500050009000832045009673591428249087005518020007',
    swordfish: '160543070078601435435807601720458069600912057000376004016030040300080016007164503'
};
class ExtArray extends Array {
    remove(item) {
        this.removeAt(this.indexOf(item));
    }
    removeAt(idx) {
        if (idx < 0)
            return;
        const last = this.pop();
        if (idx < this.length)
            this[idx] = last;
    }
    include(...items) {
        for (const item of items)
            if (!this.includes(item)) {
                this.push(item);
            }
    }
}
class ExtMap extends Map {
    constructor(itemCreator) {
        super();
        this.itemCreator = itemCreator;
    }
    getOrCreate(key) {
        let v = this.get(key);
        if (!v) {
            this.set(key, v = this.itemCreator(key));
        }
        return v;
    }
}
/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />
class Rule {
    constructor(name, fn) {
        this.name = name;
        this.fn = fn;
    }
}
const rules = [
    new Rule('Naked Single', (game) => {
        const list = game.cellsByCandidateCount[1];
        if (list.length) {
            const cell = list[0];
            const digit = game.board.candidatesTable[cell].getNthCandidate(0);
            return [new Solve(cell, digit)];
        }
    }),
    new Rule('Hidden Single', (game) => {
        const list = game.candidatePositions.byCount[1];
        if (list.length) {
            const posKey = list[0];
            const [btIdx, bIdx, digit] = CandidatePositions.key2Idx(posKey);
            const cell = game.candidatePositions.positions[posKey][0];
            return [new Solve(cell, digit, blockTypes[btIdx].name)];
        }
    }),
    new Rule('Naked Pair', (game) => {
        const candidatesTable = game.board.candidatesTable;
        const pairs = {};
        for (const cell of game.cellsByCandidateCount[2]) {
            const bits = candidatesTable[cell].bits;
            for (let btIdx = 0; btIdx < 3; ++btIdx) {
                const blockType = blockTypes[btIdx];
                const blkIdx = blockType.getIdx(cell);
                const key = (btIdx << 13) | (blkIdx << 9) | bits;
                let otherCell;
                if ((otherCell = pairs[key]) !== undefined) {
                    // pair(cell, otherCell) found
                    const removes = [];
                    for (const tidx of blockType.blocks[blkIdx]) {
                        let removeBits;
                        if (tidx !== cell && tidx !== otherCell && (removeBits = candidatesTable[tidx].bits & bits)) {
                            removes.push(new Remove(tidx, removeBits, name));
                        }
                    }
                    if (removes.length)
                        return removes;
                }
                else {
                    pairs[key] = cell;
                }
            }
        }
    }),
    new Rule('Hidden Pair', (game) => {
        const candidatesTable = game.board.candidatesTable;
        for (const { name, blocks } of blockTypes)
            for (const block of blocks) {
                const found2exactly = {}; // map[idx1+'_'+idx2] = digit;
                for (let digit = 1, bitmask = 1; digit <= 9; ++digit, bitmask <<= 1) {
                    const positions = [];
                    for (const cell of block) {
                        if (candidatesTable[cell].bits & bitmask) {
                            if (positions.push(cell) > 2)
                                break;
                        }
                    }
                    if (positions.length === 2) {
                        const [p0, p1] = positions;
                        const key = p0 + '_' + p1;
                        const pairDigit = found2exactly[key];
                        if (pairDigit) {
                            const f2bitmask = (1 << digit - 1) | (1 << pairDigit - 1);
                            const removes = [];
                            let bits = candidatesTable[p0].bits & ~f2bitmask;
                            if (bits) {
                                removes.push(new Remove(p0, bits, name));
                            }
                            bits = candidatesTable[p1].bits & ~f2bitmask;
                            if (bits) {
                                removes.push(new Remove(p1, bits, name));
                            }
                            if (removes.length)
                                return removes;
                        }
                        else {
                            found2exactly[key] = digit;
                        }
                    }
                }
            }
    }),
    new Rule('Naked Triple', (game) => {
        const candidatesTable = game.board.candidatesTable;
        for (const { name, blocks } of blockTypes)
            for (const block of blocks) {
                const triples = new ExtMap(() => new ExtArray());
                for (const cell of block) {
                    const { count, bits } = candidatesTable[cell];
                    if (count === 2) {
                        // generate all bit triplets with the two bits from "bits" - there are 7 (9-2)
                        for (let dbit = 1 << 8; dbit; dbit >>= 1)
                            if (!(bits & dbit)) {
                                triples.getOrCreate(bits | dbit).include(cell);
                            }
                    }
                    else if (count === 3) {
                        triples.getOrCreate(bits).include(cell);
                    }
                }
                for (const [tribits, triple] of triples) {
                    if (triple.length === 3) {
                        const removes = [];
                        for (const cell of block) {
                            let removeBits;
                            if (!triple.includes(cell) && (removeBits = candidatesTable[cell].bits & tribits)) {
                                removes.push(new Remove(cell, removeBits, name));
                            }
                        }
                        if (removes.length)
                            return removes;
                    }
                }
            }
    }),
    new Rule('Hidden Triple', (game) => {
        const candidatesTable = game.board.candidatesTable;
        for (const { name, blocks } of blockTypes)
            for (const block of blocks) {
                const triples = new ExtMap(() => new ExtArray()); // ["p1_p2_p3"] = [digit1, digit2, ...]
                for (let digit = 1, bitmask = 1; digit <= 9; ++digit, bitmask <<= 1) {
                    const positions = [];
                    for (const cell of block) {
                        if (candidatesTable[cell].bits & bitmask) {
                            if (positions.push(cell) > 3)
                                break;
                        }
                    }
                    if (positions.length === 2) {
                        for (const pos of block)
                            if (pos !== positions[0] && pos !== positions[1]) {
                                // we know that positions[] is sorted, just need to insert pos
                                let idx = 0;
                                const key = positions.slice();
                                while (pos >= key[idx])
                                    ++idx;
                                key.splice(idx, 0, pos);
                                triples.getOrCreate(key.join('_')).include(digit);
                            }
                    }
                    else if (positions.length === 3) {
                        triples.getOrCreate(positions.join('_')).include(digit);
                    }
                }
                for (const [keyStr, digits] of triples) {
                    if (digits.length === 3) {
                        const removes = [];
                        const positions = keyStr.split('_').map(x => parseInt(x, 10));
                        const bitmask = digits.reduce((mask, digit) => mask | (1 << digit - 1), 0);
                        for (const pos of positions) {
                            const bits = candidatesTable[pos].bits & ~bitmask;
                            if (bits) {
                                removes.push(new Remove(pos, bits, name));
                            }
                        }
                        if (removes.length)
                            return removes;
                    }
                }
            }
    }),
    new Rule('Locked Candidate', (game) => {
        const candidatesTable = game.board.candidatesTable;
        function processBlocks(blockType, against) {
            for (const block of blockType.blocks) {
                const digitPos = Array.from(Array(9), () => []);
                for (const cell of block) {
                    for (const digit of candidatesTable[cell]) {
                        digitPos[digit - 1].push(cell);
                    }
                }
                for (let digit = 1; digit <= 9; ++digit) {
                    const positions = digitPos[digit - 1];
                    if (positions.length < 2 || positions.length > 3)
                        continue;
                    const digitMask = 1 << digit - 1;
                    const firstPos = positions[0];
                    const lastPos = positions[positions.length - 1];
                    for (const againstBlk of against) {
                        const blkIdx = againstBlk.getIdx(firstPos);
                        // same block?
                        if (againstBlk.getIdx(lastPos) === blkIdx && (positions.length < 3 || againstBlk.getIdx(positions[1]) === blkIdx)) {
                            const removes = [];
                            for (const cell of againstBlk.blocks[blkIdx])
                                if (cell < firstPos || cell > lastPos) {
                                    if (candidatesTable[cell].bits & digitMask)
                                        removes.push(new Remove(cell, digitMask, blockType.name + '->' + againstBlk.name));
                                }
                            if (removes.length)
                                return removes;
                            break; // only applies in case of box -> [row, col] - if candidates are in the same row, they can't be in the same col
                        }
                    }
                }
            }
        }
        return processBlocks(box, [row, col]) || processBlocks(row, [box]) || processBlocks(col, [box]);
    }),
    new Rule('X-Wing', (game) => {
        const candidatesTable = game.board.candidatesTable;
        function findXWing(baseBlk, coverBlks) {
            for (let digit = 1; digit <= 9; ++digit) {
                const digitMask = 1 << digit - 1;
                const found2exactly = Array.from(coverBlks, () => ({}));
                for (const block of baseBlk.blocks) {
                    const positions = [];
                    for (const cell of block)
                        if (candidatesTable[cell].bits & digitMask)
                            positions.push(cell);
                    if (positions.length === 2) {
                        for (let ci = 0; ci < coverBlks.length; ++ci) {
                            const coverBlk = coverBlks[ci];
                            const blkIdxs = positions.map(coverBlk.getIdx);
                            const key = blkIdxs.join('_');
                            let otherPositions;
                            if (otherPositions = found2exactly[ci][key]) {
                                const except = positions.concat(otherPositions);
                                const removes = [];
                                for (const blkIdx of blkIdxs)
                                    for (const cell of coverBlk.blocks[blkIdx])
                                        if (!except.includes(cell)) {
                                            if (candidatesTable[cell].bits & digitMask)
                                                removes.push(new Remove(cell, digitMask, baseBlk.name + '->' + coverBlk.name));
                                        }
                                if (removes.length)
                                    return removes;
                            }
                            else
                                found2exactly[ci][key] = positions;
                        }
                    }
                }
            }
        }
        return findXWing(row, [col, box]) || findXWing(col, [row, box]) || findXWing(box, [row, col]);
    }),
    new Rule('Swordfish', (game) => {
        const candidatesTable = game.board.candidatesTable;
        function findSwordfish(baseBlk, coverBlk) {
            for (let digit = 1; digit <= 9; ++digit) {
                const digitMask = 1 << digit - 1;
                const triples = new ExtMap(() => []);
                for (const block of baseBlk.blocks) {
                    const positions = [];
                    for (const cell of block)
                        if (candidatesTable[cell].bits & digitMask)
                            positions.push(cell);
                    if (positions.length === 2) {
                        const keyArr = positions.map(coverBlk.getIdx);
                        for (let blkidx = 0; blkidx < 9; ++blkidx)
                            if (blkidx !== keyArr[0] && blkidx !== keyArr[1]) {
                                // we know that keyArr[] is sorted, just need to insert blkidx
                                let idx = 0;
                                const key = keyArr.slice();
                                while (blkidx >= key[idx])
                                    ++idx;
                                key.splice(idx, 0, blkidx);
                                triples.getOrCreate(key.join('_')).push(positions);
                            }
                    }
                    else if (positions.length === 3) {
                        triples.getOrCreate(positions.map(coverBlk.getIdx).join('_')).push(positions);
                    }
                    for (const [keyStr, blocks] of triples) {
                        if (blocks.length === 3) {
                            const removes = [];
                            const blkIdxs = keyStr.split('_').map(x => parseInt(x, 10));
                            const except = blocks[0].concat(blocks[1], blocks[2]); // flatten
                            for (const blkIdx of blkIdxs)
                                for (const cell of coverBlk.blocks[blkIdx])
                                    if (!except.includes(cell)) {
                                        if (candidatesTable[cell].bits & digitMask)
                                            removes.push(new Remove(cell, digitMask, baseBlk.name + '->' + coverBlk.name));
                                    }
                            if (removes.length)
                                return removes;
                        }
                    }
                }
            }
        }
        return findSwordfish(row, col) || findSwordfish(col, row);
    })
];
/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />
/// <reference path="Observable.ts" />
class CellsByCandidateCount extends Array {
    constructor(board) {
        super();
        this.board = board;
        this.observer = new Observer();
        for (let i = 0; i < 10; ++i)
            this[i] = new ExtArray();
        this.fillTable();
        this.observer.observeAndCall(board, this, 'candidatesChanged', 'cellSet', 'cellUnset');
    }
    fillTable() {
        const candidatesTable = this.board.candidatesTable;
        let i;
        for (i = 0; i < 81; ++i)
            if (!this.board.table[i])
                this[candidatesTable[i].count].push(i);
    }
    candidatesChanged(cell, oldCandidates, newCandidates) {
        this[oldCandidates.count].remove(cell);
        this[newCandidates.count].push(cell);
    }
    cellSet(cell, digit, oldCandidates) {
        // when this event is fired, the candidatesTable still contains the unchanged value (count)
        this[oldCandidates.count].remove(cell);
    }
    cellUnset(cell, digit, newCandidates) {
        // when this event is fired, the candidatesTable contains the new value (count)
        this[newCandidates.count].push(cell);
    }
    destroy() {
        this.observer.destroy();
    }
}
/// <reference path="Board.ts" />
/// <reference path="BlockType.ts" />
/// <reference path="ExtArray.ts" />
/// <reference path="CellsByCandidateCount.ts" />
class BacktrackSolver {
    constructor(game) {
        this.game = game;
    }
    solve() {
        this.callCounter = 0;
        this.solutionCount = 0;
        this.solveNextCell();
        //console.log('callCounter:', this.callCounter, 'solutions:', this.solutionCount);
        return this.solutionCount;
    }
    solveNextCell(cnum = 0) {
        if (++this.callCounter > 1000) {
            this.solutionCount = -1;
            return;
        }
        const game = this.game;
        while (cnum <= 9 && game.cellsByCandidateCount[cnum].length === 0)
            cnum++;
        if (cnum === 0)
            return; // there is a cell with 0 candidates => no solution
        if (cnum === 10) {
            this.solutionCount++;
            return;
        }
        let pnum = 1;
        while (pnum <= 9 && game.candidatePositions.byCount[pnum].length === 0)
            pnum++;
        if (cnum <= pnum) {
            const cell = game.cellsByCandidateCount[cnum][0];
            for (const digit of game.board.candidatesTable[cell]) {
                game.board.setCell(cell, digit);
                this.solveNextCell(cnum - 1);
                game.history.undoLastStep();
                if (this.solutionCount > 1)
                    break;
            }
            // this.cellsByCandidateCnt[cnum].push(cell);
        }
        else {
            const pKey = game.candidatePositions.byCount[pnum][0];
            const [btIdx, bIdx, digit] = CandidatePositions.key2Idx(pKey);
            const bitmask = 1 << digit - 1;
            for (const cell of blockTypes[btIdx].blocks[bIdx]) {
                if (game.board.candidatesTable[cell].bits & bitmask) {
                    game.board.setCell(cell, digit);
                    this.solveNextCell(cnum - 1);
                    game.history.undoLastStep();
                    if (this.solutionCount > 1)
                        break;
                }
            }
        }
    }
}
/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />
class CandidatePositions {
    constructor(board) {
        this.board = board;
        // key = # of positions, value = posKey
        this.byCount = [];
        this.observer = new Observer();
        this.fillTable();
        this.observer.observeAndCall(board, this, 'candidatesChanged', 'cellSet', 'cellUnset');
    }
    static key2Idx(posKey) {
        const btIdx = posKey / 81 | 0;
        const bIdx = (posKey / 9 | 0) % 9;
        const digit = (posKey % 9) + 1;
        return [btIdx, bIdx, digit];
    }
    fillTable() {
        const candidates = this.board.candidatesTable;
        const positions = this.positions = Array.from(Array(3 * 9 * 9), () => new ExtArray());
        let idx = 0;
        for (let btIdx = 0; btIdx < 3; ++btIdx) {
            const { blocks } = blockTypes[btIdx];
            for (let blockIdx = 0; blockIdx < 9; ++blockIdx, idx += 9) {
                for (const cell of blocks[blockIdx]) {
                    for (const digit of candidates[cell]) {
                        positions[idx + digit - 1].push(cell);
                    }
                }
            }
        }
        const byCount = this.byCount = Array.from(Array(10), () => new ExtArray());
        for (let i = 0; i < positions.length; ++i) {
            byCount[positions[i].length].push(i);
        }
    }
    candidatesChanged(cell, oldCandidates, newCandidates) {
        const changedBits = oldCandidates.bits ^ newCandidates.bits;
        const added = oldCandidates.count < newCandidates.count;
        const digits = [...Candidates.prototype[Symbol.iterator].call({ bits: changedBits })];
        for (let btIdx = 0, keyBtPre = 0; btIdx < 3; ++btIdx, keyBtPre += 81) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const keyPre = keyBtPre + bIdx * 9;
            for (const digit of digits) {
                const htKey = keyPre + digit - 1;
                const list = this.positions[htKey];
                this.byCount[list.length].remove(htKey);
                if (added)
                    list.push(cell);
                else
                    list.remove(cell);
                this.byCount[list.length].push(htKey);
            }
        }
    }
    cellSet(cell, digit, oldCandidates) {
        this.candidatesChanged(cell, oldCandidates, new Candidates(0, 0));
    }
    cellUnset(cell, digit, newCandidates) {
        this.candidatesChanged(cell, new Candidates(0, 0), newCandidates);
    }
    destroy() {
        this.observer.destroy();
    }
}
/// <reference path="Board.ts" />
class BoardHistory {
    constructor(board) {
        this.board = board;
        this.steps = [];
        this.recorded = [];
        this.observer = new Observer();
        this.observer.observeAndCall(board, this, 'candidatesChanged', 'cellSet', 'stepDone');
    }
    candidatesChanged(cell, oldC, newC, bitmask, add) {
        this.recorded.push(['c', cell, bitmask, add]);
    }
    cellSet(cell, digit, oldC) {
        this.recorded.push(['s', cell, oldC.bits, false]);
    }
    stepDone() {
        if (this.recorded.length) {
            this.steps.push(this.recorded);
            this.recorded = [];
        }
    }
    undoLastStep() {
        if (this.recorded.length)
            throw new Error('Still recording!');
        if (this.steps.length === 0)
            return;
        this.observer.suspend('candidatesChanged');
        for (const [op, cell, bits, add] of this.steps.pop().reverse()) {
            if (op === 's') {
                this.board.unSetCell(cell, bits);
            }
            else if (op === 'c') {
                this.board.changeCandidate(cell, bits, !add);
            }
        }
        this.observer.resume('candidatesChanged');
    }
    clone(board) {
        const history = new BoardHistory(board);
        history.steps = this.steps.slice();
        return history;
    }
}
/// <reference path="Board.ts" />
/// <reference path="BacktrackSolver.ts" />
/// <reference path="CandidatePositions.ts" />
/// <reference path="BoardHistory.ts" />
/// <reference path="Rule.ts" />
class Game {
    constructor(container, rules) {
        this.container = container;
        this.rules = rules;
        this.loadTable();
    }
    loadTable(table) {
        this.board = new Board(table);
        this.history = new BoardHistory(this.board);
        this.cellsByCandidateCount = new CellsByCandidateCount(this.board);
        this.candidatePositions = new CandidatePositions(this.board);
        this.solver = new BacktrackSolver(this);
        this.render(this.container);
    }
    render(container) {
        this.board.render(this.container = container || this.container);
    }
    runRule(ruleFn) {
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
                if (this.board.numCellsSolved === 81)
                    return;
                i = 0;
            }
            else {
                ++i;
            }
        }
    }
    destroy() {
        this.cellsByCandidateCount.destroy();
    }
}
/// <reference path="Board.ts" />
/// <reference path="Rule.ts" />
/// <reference path="Game.ts" />
class Generator {
    constructor(container) {
        this.container = container;
    }
    generate(rules) {
        this.game = new Game(this.container, rules);
        this.tryAddNextClue();
        // this.tryRemoveClues();
        return this.game;
    }
    tryAddNextClue() {
        const game = this.game;
        const solver = game.solver;
        const board = game.board;
        const candidatesTable = board.candidatesTable;
        for (let cnum = 9; cnum >= 1; --cnum) {
            if (game.cellsByCandidateCount[cnum].length === 0)
                continue;
            const cells = game.cellsByCandidateCount[cnum].slice();
            this.randomizePermutation(cells);
            for (const cell of cells) {
                const candidates = [...candidatesTable[cell]];
                this.randomizePermutation(candidates);
                for (const candidate of candidates) {
                    board.setCell(cell, candidate);
                    const solutions = solver.solve();
                    if (solutions === 1)
                        return true;
                    if (solutions > 1) {
                        if (this.tryAddNextClue())
                            return true;
                    }
                    game.history.undoLastStep();
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
    randomizePermutation(array) {
        for (let i = array.length; i > 1;) {
            const rIdx = Math.random() * i | 0;
            if (rIdx < --i) {
                const tmp = array[rIdx];
                array[rIdx] = array[i];
                array[i] = tmp;
            }
        }
    }
}
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
};
let generator = new Generator($('#container'));
let game = new Game($('#container'), rules);
const loadSelect = $('#loadTable');
Object.keys(sampleTables).forEach(key => loadSelect.options.add(new Option(key, key)));
loadSelect.addEventListener('change', () => {
    game.loadTable(sampleTables[loadSelect.value]);
    console.log(`Loaded "${loadSelect.value}."`);
});
loadSelect.value = 'generated_hard';
loadSelect.dispatchEvent(new Event('change'));
$('#validateBtn').addEventListener('click', () => game.board.checkValidity());
$('#undoBtn').addEventListener('click', () => {
    game.history.undoLastStep();
    game.render();
});
$('#nextBtn').addEventListener('click', () => game.runRulesForNextStep());
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
        game.runRulesUntilDone();
        let solver = game.solver;
        solutions = solver.solve();
        calls = solver.callCounter;
    });
    console.log('solutions: ', solutions, 'in', time, 'ms', calls, 'calls');
    game.render();
});
//# sourceMappingURL=slydoku.js.map