class BlockType {
    constructor(public name:string, public blocks:number[][], public getIdx:(cell:number) => number) {}
}

const fill9x9 = (fn) => Array.from(Array(9), (_, idx) => Array.from(Array(9), (_, cell) => fn(idx, cell)));

const row = new BlockType('row', fill9x9((i, c) => i*9+c), i => i/9|0 );
const col = new BlockType('col', fill9x9((i, c) => c*9+i), i => i%9 );
const box = new BlockType('box', fill9x9((i, c) => (i/3|0)*27+(i%3)*3 + (c/3|0)*6+c), i => (i/27|0)*3+(i%9)/3|0 );

const blockTypes = Object.assign([row, col, box], {row, col, box});