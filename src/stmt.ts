import { Identifier, ParserError, UnprocessedStatement, UnprocessedStatementParser } from "./unprocessed_stmt";

export class ModuleStmt {
    constructor(
        public identifier: Identifier,

        public module_header: UnprocessedStatement,
        public linkage: UnprocessedStatement,
        public meta: UnprocessedStatement,
        public revision: UnprocessedStatement,
        public body: UnprocessedStatement) { }

    static parse(unprocessed: UnprocessedStatement): ModuleStmt {
        let identifier = new Identifier(unprocessed.argumentOrError())

        let parser = new UnprocessedStatementParser()
        parser.fetch(unprocessed)

        let result = new ModuleStmt(identifier,
            parser.takeOne("module-header"),
            parser.takeOne("linkage"),
            parser.takeOne("meta"),
            parser.takeOne("revision"),
            parser.takeOne("body"))

        parser.ensureEmpty()
        return result
    }
}

export class LeafStmt {
    constructor(
        public identifier: Identifier,
        public if_feature: string[],
        public must: MustStmt[],
        public type: UnprocessedStatement,
        public status: StatusStmt,

        public when?: WhenStmt,
        public units?: string,
        public default_?: string,
        public config?: boolean,
        public mandatory?: boolean,
        public description?: string,
        public reference?: string
    ) { }

    static parse(unprocessed: UnprocessedStatement): LeafStmt {
        let identifier = new Identifier(unprocessed.argumentOrError())

        let parser = new UnprocessedStatementParser()
        parser.fetch(unprocessed)

        let when = parser.takeOptional("when")
        let units = parser.takeOptional("units")
        let default_ = parser.takeOptional("default")
        let config = parser.takeOptional("config")
        let mandatory = parser.takeOptional("mandatory")
        let status = parser.takeOptional("status")

        let description = parser.takeOptional("description")
        let reference = parser.takeOptional("reference")
        return new LeafStmt(
            identifier,
            parser.takeZeroOrMore("if-feature").map((v) => v.argumentOrError()),
            parser.takeZeroOrMore("must").map((v) => MustStmt.parse(v)),
            parser.takeOne("type"),
            convertStatusStmt(status?.argumentOrError()),
            when == undefined ? undefined : WhenStmt.parse(when),
            units?.argumentOrError(),
            default_?.argumentOrError(),
            config == undefined ? undefined : convertBoolean(config?.argumentOrError()),
            mandatory == undefined ? undefined : convertBoolean(mandatory?.argumentOrError()),
            description?.argumentOrError(),
            reference?.argumentOrError(),
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
        public ordered_by: OrderedByStmt,
        public status: StatusStmt,

        public when?: WhenStmt,
        public units?: string,
        public config?: boolean,
        public min_elements?: number,
        public max_elements?: number,
        public description?: string,
        public reference?: string
    ) {}

    static parse(unprocessed: UnprocessedStatement): LeafListStmt {
        let identifier = new Identifier(unprocessed.argumentOrError())

        let parser = new UnprocessedStatementParser()
        parser.fetch(unprocessed)

        let ordered_by = parser.takeOptional("ordered-by")
        let when = parser.takeOptional("when")
        let units = parser.takeOptional("units")
        let config = parser.takeOptional("config")
        let min_elements = parser.takeOptional("min-elements")?.argumentOrError()
        let max_elements = parser.takeOptional("max-elements")?.argumentOrError()
        let status = parser.takeOptional("status")

        let description = parser.takeOptional("description")
        let reference = parser.takeOptional("reference")
        return new LeafListStmt(
            identifier,
            parser.takeZeroOrMore("if-feature").map((v) => v.argumentOrError()),
            parser.takeZeroOrMore("must").map((v) => MustStmt.parse(v)),
            parser.takeZeroOrMore("default").map((v) => v.argumentOrError()),
            parser.takeOne("type"),
            convertOrderedByStmt(ordered_by?.argumentOrError()),
            convertStatusStmt(status?.argumentOrError()),
            when == undefined ? undefined : WhenStmt.parse(when),
            units?.argumentOrError(),
            config == undefined ? undefined : convertBoolean(config?.argumentOrError()),
            min_elements == undefined ? undefined : convertNumber(min_elements),
            max_elements == undefined ? undefined : convertNumber(max_elements),
            description?.argumentOrError(),
            reference?.argumentOrError(),
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
        let arg = unprocessed.argumentOrError()

        let parser = new UnprocessedStatementParser()
        parser.fetch(unprocessed)

        let description = parser.takeOptional("description")?.argumentOrError()
        let reference = parser.takeOptional("reference")?.argumentOrError()

        return new WhenStmt(arg, description, reference)
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
        let arg = unprocessed.argumentOrError()

        let parser = new UnprocessedStatementParser()
        parser.fetch(unprocessed)

        return new MustStmt(
            arg,
            parser.takeOptional("error-message")?.argumentOrError(),
            parser.takeOptional("error-app-tag")?.argumentOrError(),
            parser.takeOptional("description")?.argumentOrError(),
            parser.takeOptional("reference")?.argumentOrError(),
        )
    }
}