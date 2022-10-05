import { Identifier, ParserError, UnprocessedStatement } from "./unprocessed_stmt";

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

        let result = new ModuleStmt(identifier,
            unprocessed.takeOne("module-header"),
            unprocessed.takeOne("linkage"),
            unprocessed.takeOne("meta"),
            unprocessed.takeOne("revision"),
            unprocessed.takeOne("body"))

        unprocessed.ensureEmpty()
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

        let when = unprocessed.takeOptional("when")
        let units = unprocessed.takeOptional("units")
        let default_ = unprocessed.takeOptional("default")
        let config = unprocessed.takeOptional("config")
        let mandatory = unprocessed.takeOptional("mandatory")
        let status = unprocessed.takeOptional("status")

        let description = unprocessed.takeOptional("description")
        let reference = unprocessed.takeOptional("reference")
        return new LeafStmt(
            identifier,
            unprocessed.takeZeroOrMore("if-feature").map((v) => v.argumentOrError()),
            unprocessed.takeZeroOrMore("must").map((v) => MustStmt.parse(v)),
            unprocessed.takeOne("type"),
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

        let ordered_by = unprocessed.takeOptional("ordered-by")
        let when = unprocessed.takeOptional("when")
        let units = unprocessed.takeOptional("units")
        let config = unprocessed.takeOptional("config")
        let min_elements = unprocessed.takeOptional("min-elements")?.argumentOrError()
        let max_elements = unprocessed.takeOptional("max-elements")?.argumentOrError()
        let status = unprocessed.takeOptional("status")

        let description = unprocessed.takeOptional("description")
        let reference = unprocessed.takeOptional("reference")
        return new LeafListStmt(
            identifier,
            unprocessed.takeZeroOrMore("if-feature").map((v) => v.argumentOrError()),
            unprocessed.takeZeroOrMore("must").map((v) => MustStmt.parse(v)),
            unprocessed.takeZeroOrMore("default").map((v) => v.argumentOrError()),
            unprocessed.takeOne("type"),
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

        let description = unprocessed.takeOptional("description")?.argumentOrError()
        let reference = unprocessed.takeOptional("reference")?.argumentOrError()

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

        return new MustStmt(
            arg,
            unprocessed.takeOptional("error-message")?.argumentOrError(),
            unprocessed.takeOptional("error-app-tag")?.argumentOrError(),
            unprocessed.takeOptional("description")?.argumentOrError(),
            unprocessed.takeOptional("reference")?.argumentOrError(),
        )
    }
}