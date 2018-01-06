/// <reference path="Board.ts" />
/// <reference path="ExtArray.ts" />

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
		const candidatesTable = board.candidatesTable;
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const pairs = {};
			for (const cell of block) {
				const {count, bits} = candidatesTable[cell];
				if (count === 2) {
					let otherCell:number;
					if ((otherCell = pairs[bits]) !== undefined) {
						// pair(idx, otherIdx) found
						const removes:SolveStep[] = [];
						for (const tidx of block) {
							let removeBits;
							if (tidx !== cell && tidx !== otherCell && (removeBits = candidatesTable[tidx].bits & bits)) {
								removes.push(new Remove(tidx, removeBits, name));
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
		const candidatesTable = board.candidatesTable;
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const found2exactly = {};	// map[idx1+'_'+idx2] = digit;
			for (let digit = 1, bitmask = 1; digit <= 9; ++digit, bitmask <<= 1) {
				const positions:number[] = [];
				for (const cell of block) {
					if (candidatesTable[cell].bits & bitmask) {
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
						let bits = candidatesTable[p0].bits & ~f2bitmask;
						if (bits) {
							removes.push(new Remove(p0, bits, name));
						}
						bits = candidatesTable[p1].bits & ~f2bitmask;
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
	}),
	new Rule('Naked Triple', (board) => {
		const candidatesTable = board.candidatesTable;
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const triples = new ExtMap<number, ExtArray<number>>(() => new ExtArray<number>());
			
			for (const cell of block) {
				const {count, bits} = candidatesTable[cell];
				if (count === 2) {
					// generate all bit triplets with the two bits from "bits" - there are 7 (9-2)
					for (let dbit = 1<<8; dbit; dbit >>= 1) if (!(bits & dbit)) {
						triples.getOrCreate(bits | dbit).include(cell);
					}
				} else if (count === 3) {
					triples.getOrCreate(bits).include(cell);
				}
			}

			for (const [tribits, triple] of triples) {
				if (triple.length === 3) {
					const removes:SolveStep[] = [];
					for (const cell of block) {
						let removeBits;
						if (!triple.includes(cell) && (removeBits = candidatesTable[cell].bits & tribits)) {
							removes.push(new Remove(cell, removeBits, name));
						}
					}
					if (removes.length) return removes;
				}
			}
		}
	}),
	new Rule('Hidden Triple', (board) => {
		const candidatesTable = board.candidatesTable;
		for (const {name, blocks} of blockTypes) for (const block of blocks) {
			const triples = new ExtMap<string, ExtArray<number>>(() => new ExtArray<number>()); // ["p1_p2_p3"] = [digit1, digit2, ...]

			for (let digit = 1, bitmask = 1; digit <= 9; ++digit, bitmask <<= 1) {
				const positions:number[] = [];
				for (const cell of block) {
					if (candidatesTable[cell].bits & bitmask) {
						if (positions.push(cell) > 3) break;
					}
				}
				if (positions.length === 2) {
					for (const pos of block) if (pos !== positions[0] && pos !== positions[1]) {
						// we know that positions[] is sorted, just need to insert pos
						let idx = 0;
						const key = positions.slice();
						while (pos >= key[idx]) ++idx;
						key.splice(idx, 0, pos);
						triples.getOrCreate(key.join('_')).include(digit);
					}
				} else if (positions.length === 3) {
					triples.getOrCreate(positions.join('_')).include(digit);
				}
			}

			for (const [keyStr, digits] of triples) {
				if (digits.length === 3) {
					const removes:SolveStep[] = [];
					const positions = keyStr.split('_').map(x => parseInt(x, 10));
					const bitmask = digits.reduce((mask, digit) => mask | (1<<digit-1), 0);
					for (const pos of positions) {
						const bits = candidatesTable[pos].bits & ~bitmask;
						if (bits) {
							removes.push(new Remove(pos, bits, name));
						}
					}
					if (removes.length) return removes;
				}
			}
		}
	})
];
