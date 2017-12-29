/// <reference path="Board.ts" />

class Rule {
    constructor(public name:string, public fn:RuleFn) {}
}

const rules = [
	new Rule('Naked Single', (board) => {
		for (let i = 0; i < 81; ++i) {
			const candidates = board.candidatesTable[i];
			if (candidates.count === 1) {
				for (const digit of candidates) return [new Solve(i, digit)]; // solve cell 'i' with 'digit'
			}
		}
	}),
	new Rule('Hidden Single', (board) => {
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const digitCount = [0,0,0,0,0,0,0,0,0,0];
			const seenIdx:number[] = [];
			for (const cell of block) {
				for (const digit of board.candidatesTable[cell]) { digitCount[digit]++; seenIdx[digit] = cell; }
			}
			for (let digit = 1; digit <= 9; ++digit) {
				if (digitCount[digit] === 1) return [new Solve(seenIdx[digit], digit, name)];
			}
		}
	}),
	new Rule('Naked Pair', (board) => {
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const pairs = {};
			for (const cell of block) {
				const {count, bits} = board.candidatesTable[cell];
				if (count === 2) {
					let otherCell:number;
					if ((otherCell = pairs[bits]) !== undefined) {
						// pair(idx, otherIdx) found
						const removes:SolveStep[] = [];
						for (const tidx of block) {
							if (tidx !== cell && tidx !== otherCell && (board.candidatesTable[tidx].bits & bits)) {
								removes.push(new Remove(tidx, board.candidatesTable[tidx].bits & bits, name));
							}
						}
						if (removes.length) return removes;
					}
					pairs[bits] = cell;
				}
			}
		}
	}),
	new Rule('Hidden Pair', (board) => {
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const found2exactly = {};	// map[idx1+'_'+idx2] = digit;
			for (let digit = 1, bitmask = 1; digit <= 9; ++digit, bitmask <<= 1) {
				const positions:number[] = [];
				for (const cell of block) {
					if (board.candidatesTable[cell].bits & bitmask) {
						if (positions.push(cell) > 2) break;
					}
				}
				if (positions.length === 2) {
					const [p0, p1] = positions;
					const key = p0 + '_' + p1;
					const pairDigit = found2exactly[key];

					if (pairDigit) {
						const f2bitmask = (1 << digit-1) | (1 << pairDigit-1);
						const removes:SolveStep[] = [];
						let bits = board.candidatesTable[p0].bits ^ f2bitmask;
						if (bits) {
							removes.push(new Remove(p0, bits, name));
						}
						bits = board.candidatesTable[p1].bits ^ f2bitmask;
						if (bits) {
							removes.push(new Remove(p1, bits, name));
						}
						if (removes.length) return removes;
					} else {
						found2exactly[key] = digit;
					}
				}
			}
		}
	})
];
