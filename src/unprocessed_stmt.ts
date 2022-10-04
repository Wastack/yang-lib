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
    sub_statements: UnprocessedStatement[]
    identifier: Identifier
    prefix: string | null
    argument: string | null

    constructor(identifier: Identifier, prefix?: string, argument?: string) {
        this.sub_statements = []
        this.identifier = identifier
        this.argument = argument == undefined ? null : argument
        this.prefix = prefix == undefined ? null : prefix
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

            result.sub_statements.push(child)
        }

        return result
    }

    popSubStmt(): UnprocessedStatement | undefined {
        return this.sub_statements.pop()
    }

    argumentOrError(): string {
        if (this.argument == null) {
            throw new ParserError("argument is mandatory for " + this.identifier)
        }

        return this.argument
    }
}


export class UnprocessedStatementParser {
    /// Aggregated substatements of the same type
    fetched: Map<string, UnprocessedStatement[]>

    constructor() {
        this.fetched = new Map()
    }

    fetch(parent: UnprocessedStatement) {
        for (; ;) {
            let child = parent.popSubStmt()
            if (child == undefined) {
                break
            }

            let entry = this.fetched.get(child?.identifier.content)
            if (entry == undefined) {
                this.fetched.set(child?.identifier.content, [child])
            } else {
                entry.push(child)
            }
        }
    }

    takeOne(key: string): UnprocessedStatement {
        let stmts = this.fetched.get(key)
        if (stmts == undefined || stmts.length == 0 || stmts.length > 1) {
            throw new LexerError(`cardinality error: there should be 1 ${key}`)
        }

        this.fetched.delete(key)
        return stmts[0]
    }

    takeOptional(key: string): UnprocessedStatement | undefined {
        let stmts = this.fetched.get(key)
        if (stmts != undefined && stmts.length > 1) {
            throw new LexerError(`cardinality error: there should be 0..1 ${key}`)
        }

        this.fetched.delete(key)
        return stmts == undefined ? undefined : (stmts.length == 0 ? undefined : stmts[0])
    }

    takeOneOrMore(key: string): UnprocessedStatement[] {
        let stmts = this.fetched.get(key)
        if (stmts == undefined || stmts.length == 0) {
            throw new LexerError(`cardinality error: there should be 1..n ${key}`)
        }

        this.fetched.delete(key)
        return stmts == undefined ? [] : stmts
    }

    takeZeroOrMore(key: string): UnprocessedStatement[] {
        let stmts = this.fetched.get(key)
        this.fetched.delete(key)
        return stmts == undefined ? [] : stmts
    }

    ensureEmpty() {
        if (this.fetched.size > 0) {
            throw new LexerError(`Found unknown substatements: ${this.fetched.keys()}`)
        }
    }

}