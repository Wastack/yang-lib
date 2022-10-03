import { BlockBeginToken, Lexer, StatementEndToken, StringToken } from "./lexer"


export class ParserError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

class UnprocessedStatement {
    sub_statements: UnprocessedStatement[]
    identifier: string
    prefix: string | null
    argument: string | null

    constructor(identifier: string, prefix?: string, argument?: string) {
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

        let result = new UnprocessedStatement(identifier, prefix)

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
}