import { Cardinality, Identifier, ParserError, TakeParam, UnprocessedStatement } from "./unprocessed_stmt";

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
            new Identifier(unprocessed.argumentOrError()),
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
            new Identifier(unprocessed.argumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("if-feature", Cardinality.ZeroOrMore, (v) => v.argumentOrError()),
                new TakeParam("must", Cardinality.ZeroOrMore, MustStmt.parse),
                new TakeParam("type", Cardinality.One, (v) => v),
                new TakeParam("status", Cardinality.ZeroOrOne, (v) => convertStatusStmt(v.argumentOrError())),
                new TakeParam("when", Cardinality.ZeroOrOne, WhenStmt.parse),
                new TakeParam("units", Cardinality.ZeroOrOne, (v) => v.argumentOrError()),
                new TakeParam("default", Cardinality.ZeroOrOne, (v) => v.argumentOrError()),
                new TakeParam("config", Cardinality.ZeroOrOne, (v) => convertBoolean(v.argumentOrError())),
                new TakeParam("mandatory", Cardinality.ZeroOrOne, (v) => convertBoolean(v.argumentOrError())),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
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
            new Identifier(unprocessed.argumentOrError()),
            ...unprocessed.takeAll(
                new TakeParam("if-feature", Cardinality.ZeroOrMore, (v) => v.argumentOrError()),
                new TakeParam("must", Cardinality.ZeroOrMore, MustStmt.parse),
                new TakeParam("default", Cardinality.ZeroOrMore, (v) => v.argumentOrError()),
                new TakeParam("type", Cardinality.One, (v) => v),

                new TakeParam("ordered-by", Cardinality.ZeroOrOne, (v) => convertOrderedByStmt(v.argumentOrError())),
                new TakeParam("status", Cardinality.ZeroOrOne, (v) => convertStatusStmt(v.argumentOrError())),
                new TakeParam("when", Cardinality.ZeroOrOne, WhenStmt.parse),
                new TakeParam("units", Cardinality.ZeroOrOne, (v) => v.argumentOrError()),
                new TakeParam("config", Cardinality.ZeroOrOne, (v) => convertBoolean(v.argumentOrError())),
                new TakeParam("min-elements", Cardinality.ZeroOrOne, (v) => convertNumber(v.argumentOrError())),
                new TakeParam("max-elements", Cardinality.ZeroOrOne, (v) => convertNumber(v.argumentOrError())),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
            )
        )
    }
}

function convertNumber(text: string): number {
    let num = +text
    if (Number.isNaN(num)) {
        throw new ParserError(`expected the string token '${text}' to be a number`)
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

function convertStatusStmt(text?: string): StatusStmt {
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
            unprocessed.argumentOrError(),
            ...unprocessed.takeAll(
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
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
            unprocessed.argumentOrError(),
            ...unprocessed.takeAll(
                new TakeParam("error-message", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("error-app-tag", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
            )
        )
    }
}
