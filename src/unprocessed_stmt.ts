import { BlockBeginToken, Lexer, StatementEndToken, StringToken } from "./lexer"


export class ParserError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class Identifier {
    content: string

    constructor(content: string) {
        this.content = content
    }
}

export class UnprocessedStatement {
    sub_statements: Map<string, UnprocessedStatement[]>
    identifier: Identifier
    prefix?: string
    argument?: string

    constructor(identifier: Identifier, prefix?: string, argument?: string) {
        this.sub_statements = new Map()
        this.identifier = identifier
        this.argument = argument
        this.prefix = prefix
    }

    add(unprocessed_stmt: UnprocessedStatement) {
        let id = unprocessed_stmt.identifier.content
        let prefix = unprocessed_stmt.prefix
        let key = prefix ? [id, prefix].join(":") : id

        let stmts = this.sub_statements.get(key)
            if (stmts != undefined) {
                stmts.push(unprocessed_stmt)
            } else {
                this.sub_statements.set(key, [unprocessed_stmt])
            }
    }

    /// statement = keyword [argument] (";" / "{" *statement "}")
    static Parse(lexer: Lexer): UnprocessedStatement | null {
        // keyword
        let token = lexer.peek()
        if (!(token instanceof StringToken)) {
            return null
        }
        lexer.getToken() // remove after peek

        let keyword = (token as StringToken).content
        let parts = keyword.split(":")

        let identifier = parts.length > 1 ? keyword.slice(keyword.indexOf(":")) : keyword
        let prefix = parts.length > 1 ? parts[0] : undefined

        let result = new UnprocessedStatement(new Identifier(identifier), prefix)

        // [argument]
        token = lexer.peek()
        if (token instanceof StringToken) {
            result.argument = token.content
            token = lexer.getToken()
        }

        // (";" / "{" *statement "}")
        token = lexer.getToken()
        if (token instanceof StatementEndToken) {
            return result
        } else if (token instanceof BlockBeginToken) {
        } else {
            throw new ParserError("unexpected end of statement")
        }

        // *statement
        for (; ;) {
            let child = UnprocessedStatement.Parse(lexer)
            if (child == null) {
                break
            }

            result.add(child)
        }

        return result
    }

    argumentOrError(): string {
        if (this.argument == null) {
            throw new ParserError("argument is mandatory for " + this.identifier)
        }

        let arg = this.argument
        this.argument = undefined
        return arg
    }

    takeOne(key: string, prefix?: string): UnprocessedStatement {
        // empty or undefined
        key = prefix ? [key, prefix!].join(":"): key
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0 || stmts.length > 1) {
            throw new ParserError(`cardinality error: there should be 1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts[0]
    }

    takeOptional(key: string, prefix?: string): UnprocessedStatement | undefined {
        // empty or undefined
        key = prefix ? [key, prefix!].join(":"): key
        let stmts = this.sub_statements.get(key)
        if (stmts != undefined && stmts.length > 1) {
            throw new ParserError(`cardinality error: there should be 0..1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? undefined : (stmts.length == 0 ? undefined : stmts[0])
    }

    takeOneOrMore(key: string, prefix?: string): UnprocessedStatement[] {
        // empty or undefined
        key = prefix ? [key, prefix!].join(":"): key
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0) {
            throw new ParserError(`cardinality error: there should be 1..n ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    takeZeroOrMore(key: string, prefix?: string): UnprocessedStatement[] {
        // empty or undefined
        key = prefix ? [key, prefix!].join(":"): key
        let stmts = this.sub_statements.get(key)
        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    ensureEmpty() {
        if (this.sub_statements.size > 0) {
            throw new ParserError(`Found unknown substatements: ${Array.from(this.sub_statements.keys()).join(', ')}`)
        } else if (this.argument != undefined) {
            throw new ParserError(`unexpected argument entry for substatement ${this.identifier}`)
        }
    }

    /**
     * Takes all substatements of `this` and convert them to their appropriate
     * types, which is defined by the `values` parameter.
     * 
     * This call will also make sure that the argument if fetched if needed.
     */
    takeAll<T extends TakeParam<any, Cardinality>[]>(...values: T): TakeResult<T> {
        let result: any[] = []

        values.forEach((v) => {
            let children: any[] = []
            switch (v.cardinality) {
                case Cardinality.ZeroOrOne:
                    let child = this.takeOptional(v.idenfitier, v.prefix)
                    if (child == undefined) {
                        result.push(undefined)
                    } else {
                        result.push(v.parseFunc(child))
                    }
                    break
                case Cardinality.ZeroOrMore:
                    this.takeZeroOrMore(v.idenfitier, v.prefix).forEach((child) => {
                        children.push(v.parseFunc(child))
                    })
                    result.push(children)
                    break
                case Cardinality.One:
                    result.push(v.parseFunc(this.takeOne(v.idenfitier, v.prefix)))
                    break
                case Cardinality.More:
                    this.takeZeroOrMore(v.idenfitier, v.prefix).forEach((child) => {
                        children.push(v.parseFunc(child))
                    })
                    result.push(children)
                    break
            }
        })

        this.ensureEmpty()

        return result as TakeResult<T>
    }
}

export type TakeResult<T> = { [P in keyof T]: P extends TakeParam<infer RESULT, Cardinality.ZeroOrOne> ? RESULT : T extends TakeParam<infer RESULT, Cardinality.One> ? RESULT : P extends TakeParam<infer RESULT, infer _C> ? RESULT[] : never }

export enum Cardinality {
    ZeroOrOne,
    One,
    ZeroOrMore,
    More,
}

export class TakeParam<T, C extends Cardinality> {
    constructor(
        public idenfitier: string,
        public cardinality: C,
        public parseFunc: (s: UnprocessedStatement) => T,
        public prefix?: string,
    ) { }
}
