import { BlockBeginToken, Lexer, LexerError, StatementEndToken, StringToken } from "./lexer"


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
    prefix: string | null
    argument: string | null

    constructor(identifier: Identifier, prefix?: string, argument?: string) {
        this.sub_statements = new Map()
        this.identifier = identifier
        this.argument = argument == undefined ? null : argument
        this.prefix = prefix == undefined ? null : prefix
    }

    add(unprocessed_stmt: UnprocessedStatement) {
        let stmts = this.sub_statements.get(unprocessed_stmt.identifier.content)
            if (stmts != undefined) {
                stmts.push(unprocessed_stmt)
            } else {
                this.sub_statements.set(unprocessed_stmt.identifier.content, [unprocessed_stmt])
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
        this.argument = null
        return arg
    }

    takeOne(key: string): UnprocessedStatement {
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0 || stmts.length > 1) {
            throw new LexerError(`cardinality error: there should be 1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts[0]
    }

    takeOptional(key: string): UnprocessedStatement | undefined {
        let stmts = this.sub_statements.get(key)
        if (stmts != undefined && stmts.length > 1) {
            throw new LexerError(`cardinality error: there should be 0..1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? undefined : (stmts.length == 0 ? undefined : stmts[0])
    }

    takeOneOrMore(key: string): UnprocessedStatement[] {
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0) {
            throw new LexerError(`cardinality error: there should be 1..n ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    takeZeroOrMore(key: string): UnprocessedStatement[] {
        let stmts = this.sub_statements.get(key)
        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    ensureEmpty() {
        if (this.sub_statements.size > 0) {
            throw new LexerError(`Found unknown substatements: ${this.sub_statements.keys()}`)
        } else if (this.argument != null) {
            throw new LexerError(`unexpected argument entry for substatement ${this.identifier}`)
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
                    let child = this.takeOptional(v.idenfitier)
                    if (child == undefined) {
                        result.push(undefined)
                    } else {
                        result.push(v.parseFunc(child))
                    }
                    break
                case Cardinality.ZeroOrMore:
                    this.takeZeroOrMore(v.idenfitier).forEach((child) => {
                        children.push(v.parseFunc(child))
                    })
                    result.push(children)
                    break
                case Cardinality.One:
                    result.push(v.parseFunc(this.takeOne(v.idenfitier)))
                    break
                case Cardinality.More:
                    this.takeZeroOrMore(v.idenfitier).forEach((child) => {
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
    ) { }
}
