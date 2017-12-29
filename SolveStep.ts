abstract class SolveStep {
    public name;
    constructor(public op:'s'|'r', public cell:number, public digit:number, public blockName?:string) {}
    toString() {
        return `${this.name} (${this.cell/9|0}, ${this.cell%9}) - ${this.getDigits()}${this.blockName ? ' in ' + this.blockName : ''}`;
    }
    getDigits() {
        return this.digit.toString();
    }
}

class Solve extends SolveStep {
    name = 'Solve Cell';
    constructor(public cell:number, public digit:number, public blockName?:string) {
        super('s', cell, digit, blockName);
    }
}


class Remove extends SolveStep {
    name = 'Remove Candidate';
    constructor(public cell:number, public digit:number, public blockName?:string) {
        super('r', cell, digit, blockName);
    }
    getDigits() {
        return '[' + [...new Candidates(0, this.digit)].join(',') + ']';
    }
}