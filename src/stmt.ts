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

        public when?: WhenStmt,
        public units?: string,
        public default_?: string,
        public config?: boolean,
        public mandatory?: boolean,
        public status?: StatusStmt,
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
            when == undefined ? undefined : WhenStmt.parse(when),
            units?.argumentOrError(),
            default_?.argumentOrError(),
            config == undefined ? undefined : convertBoolean(config?.argumentOrError()),
            mandatory == undefined ? undefined : convertBoolean(mandatory?.argumentOrError()),
            convertStatusStmt(status?.argumentOrError()),
            description?.argumentOrError(),
            reference?.argumentOrError(),
        )
    }
}

function convertBoolean(text: string): boolean {
    if (text == "true") {
        return true
    } else if (text == "false") {
        return false
    }

    throw new ParserError("invalid boolean format")
}

export enum StatusStmt {
    current = "current",
    deprecated = "deprecated",
    obsolete = "obsolete"
}

function convertStatusStmt(text?: string): StatusStmt | undefined {
    let status = text as keyof typeof StatusStmt
    if (status != undefined && StatusStmt[status] == undefined) {
        throw new ParserError("invalid status, it can only be one")
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