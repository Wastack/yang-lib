import { Cardinality, EnsureNoSubstatements, Identifier, ParserError, TakeParam, UnprocessedStatement } from "./unprocessed_stmt";

export class ModuleStmt {
    constructor(
        public identifier: Identifier,

        public module_header: UnprocessedStatement,
        public linkage: UnprocessedStatement,
        public meta: UnprocessedStatement,
        public revision: UnprocessedStatement,
        public body: UnprocessedStatement) { }

    static parse(unprocessed: UnprocessedStatement): ModuleStmt {
        return new ModuleStmt(
            new Identifier(unprocessed.takeArgumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("module-header", Cardinality.One, (v) => v),
                new TakeParam("linkage", Cardinality.One, (v) => v),
                new TakeParam("meta", Cardinality.One, (v) => v),
                new TakeParam("revision", Cardinality.One, (v) => v),
                new TakeParam("body", Cardinality.One, (v) => v)
            )
        )
    }
}


export class LeafStmt {
    constructor(
        public identifier: Identifier,

        public if_feature: string[],
        public must: MustStmt[],

        public type: UnprocessedStatement,
        public status?: StatusStmt,

        public when?: WhenStmt,
        public units?: string,
        public default_?: string,
        public config?: boolean,
        public mandatory?: boolean,
        public description?: string,
        public reference?: string
    ) { }

    static parse(unprocessed: UnprocessedStatement): LeafStmt {
        return new LeafStmt(
            new Identifier(unprocessed.takeArgumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("if-feature", Cardinality.ZeroOrMore, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("must", Cardinality.ZeroOrMore, MustStmt.parse),
                new TakeParam("type", Cardinality.One, (v) => v),
                new TakeParam("status", Cardinality.ZeroOrOne, (v) => convertStatusStmt(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("when", Cardinality.ZeroOrOne, WhenStmt.parse),
                new TakeParam("units", Cardinality.ZeroOrOne, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("default", Cardinality.ZeroOrOne, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("config", Cardinality.ZeroOrOne, (v) => convertBoolean(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("mandatory", Cardinality.ZeroOrOne, (v) => convertBoolean(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
            ),
        )
    }
}

export class LeafListStmt {
    constructor(
        public idenfifier: Identifier,

        public if_feature: string[],
        public must: MustStmt[],
        public default_: string[],
        public type: UnprocessedStatement,
        public ordered_by?: OrderedByStmt,
        public status?: StatusStmt,

        public when?: WhenStmt,
        public units?: string,
        public config?: boolean,
        public min_elements?: number,
        public max_elements?: number,
        public description?: string,
        public reference?: string
    ) { }

    static parse(unprocessed: UnprocessedStatement): LeafListStmt {
        return new LeafListStmt(
            new Identifier(unprocessed.takeArgumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("if-feature", Cardinality.ZeroOrMore, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("must", Cardinality.ZeroOrMore, MustStmt.parse),
                new TakeParam("default", Cardinality.ZeroOrMore, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("type", Cardinality.One, (v) => v),

                new TakeParam("ordered-by", Cardinality.ZeroOrOne, (v) => convertOrderedByStmt(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("status", Cardinality.ZeroOrOne, (v) => convertStatusStmt(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("when", Cardinality.ZeroOrOne, WhenStmt.parse),
                new TakeParam("units", Cardinality.ZeroOrOne, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("config", Cardinality.ZeroOrOne, (v) => convertBoolean(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("min-elements", Cardinality.ZeroOrOne, (v) => convertInteger(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("max-elements", Cardinality.ZeroOrOne, (v) => convertInteger(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
            )
        )
    }
}

export function convertInteger(text: string): number {
    let num = +text
    if (Number.isNaN(num)) {
        throw new ParserError(`expected the string token '${text}' to be a number`)
    } else if (!Number.isInteger(num)) {
        throw new ParserError(`expected intger but found ${text}`)
    }

    return num
}

function convertBoolean(text: string): boolean {
    if (text == "true") {
        return true
    } else if (text == "false") {
        return false
    }

    throw new ParserError(`invalid boolean format: '${text}'`)
}

export enum OrderedByStmt {
    system = "system", // default
    user = "user"
}

function convertOrderedByStmt(text?: string): OrderedByStmt {
    if (text == undefined) {
        return OrderedByStmt.system
    }

    let ordered_by = text as keyof typeof OrderedByStmt
    if (ordered_by != undefined && OrderedByStmt[ordered_by] == undefined) {
        throw new ParserError(`invalid ordered-by statement '${text}', it can only be 'system' or 'user'`)
    }

    return OrderedByStmt[ordered_by]
}

export enum StatusStmt {
    current = "current", // default
    deprecated = "deprecated",
    obsolete = "obsolete"
}

export function convertStatusStmt(text?: string): StatusStmt {
    if (text == undefined) {
        return StatusStmt.current
    }

    let status = text as keyof typeof StatusStmt
    if (status != undefined && StatusStmt[status] == undefined) {
        throw new ParserError(`invalid status '${text}', it can only be one of 'current', 'deprecated' or 'obsolete'`)
    }

    return StatusStmt[status]
}

export class WhenStmt {
    constructor(
        public arg: string,
        public description?: string,
        public reference?: string
    ) { }


    static parse(unprocessed: UnprocessedStatement): WhenStmt {
        return new WhenStmt(
            unprocessed.takeArgumentOrError(),
            ...unprocessed.takeAll(
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
            )
        )
    }
}

export class MustStmt {
    constructor(
        public arg: string,
        public error_message?: string,
        public error_app_tag?: string,
        public description?: string,
        public reference?: string,
    ) { }

    static parse(unprocessed: UnprocessedStatement): MustStmt {
        return new MustStmt(
            unprocessed.takeArgumentOrError(),
            ...unprocessed.takeAll(
                new TakeParam("error-message", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("error-app-tag", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
            )
        )
    }
}


export class BitStmt {
    constructor(
        public identifier: Identifier,
        public if_feature: string[],
        public description?: string,
        public position?: number,
        public reference?: string,
        public status?: StatusStmt,
    ) { }

    static parse(unprocessed: UnprocessedStatement): BitStmt {
        return new BitStmt(
            new Identifier(unprocessed.takeArgumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("if-feature", Cardinality.ZeroOrMore, (v) => v.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("position", Cardinality.ZeroOrOne, (u) => convertPositiveInteger(u.takeArgumentOrError(EnsureNoSubstatements.Set))),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.takeArgumentOrError(EnsureNoSubstatements.Set)),
                new TakeParam("status", Cardinality.ZeroOrOne, (v) => convertStatusStmt(v.takeArgumentOrError(EnsureNoSubstatements.Set))),
            ),
        )
    }
}

export function convertPositiveInteger(text: string): number {
    let num = convertInteger(text)
    if (num < 0) {
        throw new ParserError(`bit position ${num} must be greater or equal to 0`)
    }
    return num
}