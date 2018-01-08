class Candidates {
    constructor(count, bits) {
        this.count = count;
        this.bits = bits;
    }
    solved() {
        this.count = this.bits = 0;
    }
    setBits(bits) {
        this.count = Candidates.bitcount(this.bits = bits);
    }
    removeBits(bitmask) {
        if (this.bits & bitmask) {
            this.count = Candidates.bitcount(this.bits &= ~bitmask);
            return true;
        }
        return false;
    }
    addBits(bitmask) {
        this.count = Candidates.bitcount(this.bits |= bitmask);
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
    emit(event, data) {
        const list = this.events[event];
        if (list)
            list.forEach(handler => handler(data));
    }
}
class Observer {
    constructor() {
        this.subscriptions = [];
    }
    observe(host, event, handler) {
        this.subscriptions.push([host, event, handler]);
        host.on(event, handler);
    }
    unobserve(host, event) {
        this.subscriptions = this.subscriptions.filter(([s_host, s_event, handler]) => ((!host || host === s_host) && (!event || event === s_event)) ? host.off(event, handler) : true);
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
            this.modifiedCandidates = board.modifiedCandidates.slice();
            this.numCellsSolved = board.numCellsSolved;
        }
        else {
            this.table = this.checkTableErrors(board) || Array(9 * 9).fill(0);
            this.modifiedCandidates = Array(9 * 9).fill(0);
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
                    this.removeCandidate(cell, bitmask);
            }
    }
    removeCandidate(cell, bitmask) {
        return this.candidatesTable[cell].removeBits(bitmask);
    }
    addCandidate(cell, bitmask) {
        this.candidatesTable[cell].addBits(bitmask);
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
    setCell(cell, digit, candidatesModified) {
        this.table[cell] = digit;
        this.numCellsSolved++;
        const bitmask = 1 << digit - 1;
        let modified = 0, modBit = 1;
        for (const acell of this.getAffectedCells(cell)) {
            const oldCnum = this.candidatesTable[acell].count;
            if (this.removeCandidate(acell, bitmask)) {
                modified |= modBit;
                if (candidatesModified)
                    candidatesModified(acell, oldCnum, digit);
            }
            modBit <<= 1;
        }
        this.modifiedCandidates[cell] = modified | (this.candidatesTable[cell].bits << 20);
        this.candidatesTable[cell].solved();
    }
    unSetCell(cell, candidatesModified) {
        const digit = this.table[cell];
        this.table[cell] = 0;
        this.numCellsSolved--;
        const bitmask = 1 << digit - 1;
        let modified = this.modifiedCandidates[cell];
        for (const acell of this.getAffectedCells(cell)) {
            if (modified & 1) {
                const oldCnum = this.candidatesTable[acell].count;
                this.addCandidate(acell, bitmask);
                if (candidatesModified)
                    candidatesModified(acell, oldCnum, digit);
            }
            modified >>= 1;
        }
        this.candidatesTable[cell].setBits(modified);
        this.modifiedCandidates[cell] = 0;
    }
    clearCell(cell, candidatesModified) {
        const digit = this.table[cell];
        this.table[cell] = 0;
        const affectedCells = this.getAffectedCells(cell);
        const affectedCandidateCnts = affectedCells.map(cell => this.candidatesTable[cell].count);
        this.calcCandidates(); // I don't know any faster way... If you do, let me know!
        const bitmask = 1 << digit - 1;
        let modified = 0, modBit = 1;
        for (let i = 0; i < affectedCells.length; ++i) {
            const acell = affectedCells[i];
            const oldCnum = affectedCandidateCnts[i];
            if (this.candidatesTable[acell].count !== oldCnum) {
                modified |= modBit;
                if (candidatesModified)
                    candidatesModified(acell, oldCnum, digit);
            }
            modBit <<= 1;
        }
        this.modifiedCandidates[cell] = 0; // 
        return modified | (digit << 20);
    }
    unClearCell(cell, modified, candidatesModified) {
        const digit = modified >> 20;
        this.table[cell] = digit;
        this.numCellsSolved++;
        const bitmask = 1 << digit - 1;
        for (const acell of this.getAffectedCells(cell)) {
            if (modified & 1) {
                const oldCnum = this.candidatesTable[acell].count;
                this.removeCandidate(acell, bitmask);
                if (candidatesModified)
                    candidatesModified(acell, oldCnum, digit);
            }
            modified >>= 1;
        }
        this.candidatesTable[cell].solved();
    }
    runRule(ruleFn) {
        const results = ruleFn(this);
        if (results) {
            for (const step of results) {
                this.applySolveStep(step);
            }
        }
        return results;
    }
    runRulesForNextStep(rules) {
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
        for (let idx = 0; idx < 81; ++idx)
            if (this.table[idx] === 0)
                cells.push(idx);
        return cells;
    }
    runRulesUntilDone(rules) {
        for (let i = 0; i < rules.length;) {
            if (this.runRule(rules[i].fn)) {
                if (this.numCellsSolved === 81)
                    return;
                i = 0;
            }
            else {
                ++i;
            }
        }
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
        const idx = this.indexOf(item);
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
    new Rule('Naked Single', (board) => {
        for (let i = 0; i < 81; ++i) {
            const candidates = board.candidatesTable[i];
            if (candidates.count === 1) {
                for (const digit of candidates)
                    return [new Solve(i, digit)]; // solve cell 'i' with 'digit'
            }
        }
    }),
    new Rule('Hidden Single', (board) => {
        for (const { name, blocks } of blockTypes)
            for (const block of blocks) {
                const digitCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                const seenIdx = [];
                for (const cell of block) {
                    for (const digit of board.candidatesTable[cell]) {
                        digitCount[digit]++;
                        seenIdx[digit] = cell;
                    }
                }
                for (let digit = 1; digit <= 9; ++digit) {
                    if (digitCount[digit] === 1)
                        return [new Solve(seenIdx[digit], digit, name)];
                }
            }
    }),
    new Rule('Naked Pair', (board) => {
        const candidatesTable = board.candidatesTable;
        for (const { name, blocks } of blockTypes)
            for (const block of blocks) {
                const pairs = {};
                for (const cell of block) {
                    const { count, bits } = candidatesTable[cell];
                    if (count === 2) {
                        let otherCell;
                        if ((otherCell = pairs[bits]) !== undefined) {
                            // pair(idx, otherIdx) found
                            const removes = [];
                            for (const tidx of block) {
                                let removeBits;
                                if (tidx !== cell && tidx !== otherCell && (removeBits = candidatesTable[tidx].bits & bits)) {
                                    removes.push(new Remove(tidx, removeBits, name));
                                }
                            }
                            if (removes.length)
                                return removes;
                        }
                        pairs[bits] = cell;
                    }
                }
            }
    }),
    new Rule('Hidden Pair', (board) => {
        const candidatesTable = board.candidatesTable;
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
    new Rule('Naked Triple', (board) => {
        const candidatesTable = board.candidatesTable;
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
    new Rule('Hidden Triple', (board) => {
        const candidatesTable = board.candidatesTable;
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
    new Rule('Locked Candidate', (board) => {
        const candidatesTable = board.candidatesTable;
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
    new Rule('X-Wing', (board) => {
        const candidatesTable = board.candidatesTable;
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
    new Rule('Swordfish', (board) => {
        const candidatesTable = board.candidatesTable;
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
/// <reference path="Rule.ts" />
class Generator {
    constructor(container) {
        this.container = container;
    }
    generateBoard(rules) {
        this.board = new Board();
        this.solver = new BacktrackSolver(this.board);
        this.tryAddNextClue();
        this.tryRemoveClues();
        return this.board;
    }
    tryAddNextClue() {
        const solver = this.solver;
        for (let cnum = 9; cnum >= 1; --cnum) {
            if (solver.cellsByCandidateCnt[cnum].length === 0)
                continue;
            const cells = solver.cellsByCandidateCnt[cnum].slice();
            this.randomizePermutation(cells);
            for (const cell of cells) {
                const candidates = [...this.board.candidatesTable[cell]];
                this.randomizePermutation(candidates);
                for (const candidate of candidates) {
                    solver.setCell(cell, candidate);
                    const solutions = solver.solve();
                    if (solutions === 1)
                        return true;
                    if (solutions > 1) {
                        if (this.tryAddNextClue())
                            return true;
                    }
                    solver.unSetCell(cell);
                }
            }
        }
    }
    tryRemoveClues() {
        const board = this.board;
        const solver = this.solver;
        const cellsToRemove = [];
        for (let cell = 0; cell < 81; ++cell) {
            if (board.table[cell]) {
                cellsToRemove.push([cell, Candidates.bitcount(board.modifiedCandidates[cell])]);
            }
        }
        cellsToRemove.sort((a, b) => a[1] - b[1]);
        for (const [cell, candidateCount] of cellsToRemove) {
            const modified = solver.clearCell(cell);
            const solutions = solver.solve();
            if (solutions !== 1) {
                solver.unClearCell(cell, modified);
            }
        }
    }
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
/// <reference path="BlockType.ts" />
/// <reference path="ExtArray.ts" />
class BacktrackSolver {
    constructor(board) {
        this.board = board;
        this.fillCountTables(board);
        this.candidatesChanged_Removed = this.candidatesChanged.bind(this, -1);
        this.candidatesChanged_Added = this.candidatesChanged.bind(this, 1);
    }
    fillCountTables(board) {
        const cbcc = this.cellsByCandidateCnt = Array.from(Array(10), () => new ExtArray());
        for (let i = 0; i < 81; ++i)
            if (!board.table[i])
                cbcc[board.candidatesTable[i].count].push(i);
        const htuples = this.hiddenTupleCount = Array(3 * 9 * 9).fill(0);
        let htIdx = 0;
        for (let btIdx = 0; btIdx < 3; ++btIdx) {
            const { blocks } = blockTypes[btIdx];
            for (let blockIdx = 0; blockIdx < 9; ++blockIdx, htIdx += 9) {
                for (const cell of blocks[blockIdx]) {
                    for (const digit of board.candidatesTable[cell]) {
                        ++htuples[htIdx + digit - 1];
                    }
                }
            }
        }
        const htuplesByCnt = this.hiddenTuplesByCnt = Array.from(Array(10), () => new ExtArray());
        for (let i = 0; i < htuples.length; ++i) {
            htuplesByCnt[htuples[i]].push(i);
        }
    }
    setCell(cell, digit) {
        const count = this.board.candidatesTable[cell].count;
        this.removeCellFromCBCC(cell, count);
        this.updateHiddenTupleCountForCell(cell, -1);
        this.board.setCell(cell, digit, this.candidatesChanged_Removed);
    }
    unSetCell(cell) {
        this.board.unSetCell(cell, this.candidatesChanged_Added);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCountForCell(cell, 1);
    }
    clearCell(cell) {
        const modified = this.board.clearCell(cell, this.candidatesChanged_Added);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCountForCell(cell, 1);
        return modified;
    }
    unClearCell(cell, modified) {
        const count = this.board.candidatesTable[cell].count;
        this.removeCellFromCBCC(cell, count);
        this.updateHiddenTupleCountForCell(cell, -1);
        this.board.unClearCell(cell, modified, this.candidatesChanged_Removed);
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
        while (cnum <= 9 && this.cellsByCandidateCnt[cnum].length === 0)
            cnum++;
        if (cnum === 0)
            return; // there is a cell with 0 candidates => no solution
        if (cnum === 10) {
            this.solutionCount++;
            return;
        }
        let htnum = 1;
        while (htnum <= 9 && this.hiddenTuplesByCnt[htnum].length === 0)
            htnum++;
        if (cnum <= htnum) {
            const cell = this.cellsByCandidateCnt[cnum].pop();
            this.updateHiddenTupleCountForCell(cell, -1);
            for (const digit of this.board.candidatesTable[cell]) {
                this.board.setCell(cell, digit, this.candidatesChanged_Removed);
                this.solveNextCell(cnum - 1);
                this.board.unSetCell(cell, this.candidatesChanged_Added);
                if (this.solutionCount > 1)
                    break;
            }
            this.updateHiddenTupleCountForCell(cell, 1);
            this.cellsByCandidateCnt[cnum].push(cell);
        }
        else {
            const htKey = this.hiddenTuplesByCnt[htnum][0];
            const digit = (htKey % 9) + 1;
            const bIdx = (htKey / 9 | 0) % 9;
            const btIdx = htKey / 81 | 0;
            const bitmask = 1 << digit - 1;
            for (const cell of blockTypes[btIdx].blocks[bIdx]) {
                if (this.board.candidatesTable[cell].bits & bitmask) {
                    this.removeCellFromCBCC(cell, this.board.candidatesTable[cell].count);
                    this.updateHiddenTupleCountForCell(cell, -1);
                    this.board.setCell(cell, digit, this.candidatesChanged_Removed);
                    this.solveNextCell(cnum - 1);
                    this.board.unSetCell(cell, this.candidatesChanged_Added);
                    this.updateHiddenTupleCountForCell(cell, 1);
                    this.addCellToCBCC(cell);
                    if (this.solutionCount > 1)
                        break;
                }
            }
        }
    }
    removeCellFromCBCC(cell, count) {
        this.cellsByCandidateCnt[count].remove(cell);
    }
    addCellToCBCC(cell) {
        const newCnt = this.board.candidatesTable[cell].count;
        this.cellsByCandidateCnt[newCnt].push(cell);
    }
    updateHiddenTupleCount(cell, digit, delta) {
        for (let btIdx = 0; btIdx < 3; ++btIdx) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const htKey = btIdx * 81 + bIdx * 9 + digit - 1;
            this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey]].remove(htKey);
            this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey] += delta].push(htKey);
        }
    }
    updateHiddenTupleCountForCell(cell, delta) {
        // does: for (const candidate of this.board.candidatesTable[cell]) this.updateHiddenTupleCount(cell, candidate, delta);
        const candidates = this.board.candidatesTable[cell];
        for (let btIdx = 0, htKeyBtPre = 0; btIdx < 3; ++btIdx, htKeyBtPre += 81) {
            const bIdx = blockTypes[btIdx].getIdx(cell);
            const htKeyPre = htKeyBtPre + bIdx * 9;
            for (const candidate of candidates) {
                const htKey = htKeyPre + candidate - 1;
                this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey]].remove(htKey);
                this.hiddenTuplesByCnt[this.hiddenTupleCount[htKey] += delta].push(htKey);
            }
        }
    }
    candidatesChanged(delta, cell, oldCnt, digit) {
        this.removeCellFromCBCC(cell, oldCnt);
        this.addCellToCBCC(cell);
        this.updateHiddenTupleCount(cell, digit, delta);
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
let board;
const loadSelect = $('#loadTable');
Object.keys(sampleTables).forEach(key => loadSelect.options.add(new Option(key, key)));
loadSelect.addEventListener('change', () => {
    board = new Board(sampleTables[loadSelect.value]);
    board.render($('#container'));
    console.log(`Loaded "${loadSelect.value}."`);
});
loadSelect.value = 'generated_hard';
loadSelect.dispatchEvent(new Event('change'));
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
//# sourceMappingURL=slydoku.js.map