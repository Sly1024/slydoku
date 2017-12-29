class Candidates {
    constructor(public count:number, public bits:number) {}

	// for a given [y:0..2][x:0..2] = [array of 4 indices: if 0..8 are arranged in a 3x3, then the 4 that are not in row y and not in column x]
	static boxQuad: number[][][] = [0,1,2].map(y => [0,1,2].map(x => [0,1,2,3,4,5,6,7,8].filter(v => v % 3 !== x && (v / 3 | 0) !== y)));

	solved() {
		this.count = this.bits = 0;
	}
	
	setBits(bits:number) {
		this.count = this.bitcount(this.bits = bits);
	}

	removeBits(bitmask:number) {
		if (this.bits & bitmask) {
			this.count = this.bitcount(this.bits &= ~bitmask);
			return true;
		}
		return false;
	}

	addBits(bitmask:number) {
		this.count = this.bitcount(this.bits |= bitmask);
	}

	private bitcount(n:number):number {
		// http://gurmeet.net/puzzles/fast-bit-counting-routines/
		const tmp = n - ((n >> 1) & 0o33333333333) - ((n >> 2) & 0o11111111111);
		return ((tmp + (tmp >> 3)) & 0o30707070707) % 63;
	}
    
	*[Symbol.iterator] () {
		let digit = 1, bits = this.bits;
		while (bits) {
			if (bits & 1) yield digit;
			bits >>= 1;
			++digit;
		}
	}

	getNthCandidate(n:number) {
		for (const digit of this) {
			if (n-- === 0) return digit;
		}
	}

	clone() {
		return new Candidates(this.count, this.bits);
	}
}
