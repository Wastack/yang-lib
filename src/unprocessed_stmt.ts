import { BlockBeginToken, Lexer, StatementEndToken, StringToken } from "./lexer"


/**
 * Represents an error thrown by the parser.
 */
export class ParserError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

/**
 * Identifier represents an identifier defined in RFC-6.2
 */
export class Identifier {
    content: string

    constructor(content: string) {
        this.content = content
    }
}

/**
 * Unprocessed statements are statements that are not yet parsed.
 * 
 * It is a representation of a (yet) unknown statement defined by RFC-6.3 as follows:
 * 
 * ```
 * statement = keyword [argument] (";" / "{" *statement "}")
 * ```
 */
export class UnprocessedStatement {
    /**
     * sub-statements stored in a map, where key is [<prefix>:]<identifier>
     */
    sub_statements: Map<string, UnprocessedStatement[]>

    /**
     * Identifier of the statement. E.g. "module" or "min-elements"
     */
    identifier: Identifier

    /**
     * Prefix of the identifier. It is used when using an extension, or when
     * using imported (sub)modules. Undefined means that the statement has no prefix.
     */
    prefix?: string

    /**
     * Argument of the statement, if any. E.g. from `module myModule {}`, the
     * token `myModule` is interpreted as an argument.
     */
    argument?: string

    constructor(identifier: Identifier, prefix?: string, argument?: string) {
        this.sub_statements = new Map()
        this.identifier = identifier
        this.argument = argument
        this.prefix = prefix
    }

    /**
     * Adds `uprocessed_stmt` as a sub-statement of `this`.
     * 
     * @param unprocessed_stmt sub-statement to be added
     */
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

    /** 
     * Uses the `lexer` to parse the following sequence of tokens:
     * 
     * ```
     * statement = keyword [argument] (";" / "{" *statement "}")
     * ```
     * 
     * If input string does not match the above format, it throws a
     * `ParserError`.
     */
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

    /**
     * Takes the argument from the statement if exists (not undefined, nor
     * empty). Otherwise, throw a `ParserError`.
     * 
     * After calling this method, argument is deleted from the statement.
     * 
     * @returns argument of the statement.
     */
    argumentOrError(): string {
        if (!this.argument) {
            throw new ParserError("argument is mandatory for " + this.identifier)
        }

        let arg = this.argument
        this.argument = undefined
        return arg
    }

    /**
     * Takes precisely one sub-statement by the given `identifier` and `prefix`.
     * If there is more or less than one sub-statement found, then it throws
     * `ParserError`.
     * 
     * @param identifier Identifier of the sub-statement.
     * @param prefix  Prefix of the sub-statement, if any.
     * @returns The sub-statement found with the given `key` and `prefix`.
     */
    takeOne(identifier: string, prefix?: string): UnprocessedStatement {
        let key = prefix ? [identifier, prefix!].join(":"): identifier
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0 || stmts.length > 1) {
            throw new ParserError(`cardinality error: there should be 1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts[0]
    }

    /**
     * Takes an optional sub-statement from `this` by the given `key` and
     * `prefix`. If there is more than one such sub-statement, it throws
     * `ParserError`.
     * 
     * @param identifier Identifier of the sub-statement.
     * @param prefix Prefix of the sub-statement.
     * @returns The sub-statement if it was found. `undefined` otherwise.
     */
    takeOptional(identifier: string, prefix?: string): UnprocessedStatement | undefined {
        let key = prefix ? [identifier, prefix!].join(":"): identifier
        let stmts = this.sub_statements.get(key)
        if (stmts != undefined && stmts.length > 1) {
            throw new ParserError(`cardinality error: there should be 0..1 ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? undefined : (stmts.length == 0 ? undefined : stmts[0])
    }

    /**
     * Takes one or more sub-statements from `this` by the given `key` and
     * `prefix`. If there is no such sub-statement, it throws `ParserError`.
     * 
     * @param identifier Identifier of the sub-statements.
     * @param prefix Prefix of the sub-statements.
     * @returns The sub-statements found.
     */
    takeOneOrMore(identifier: string, prefix?: string): UnprocessedStatement[] {
        let key = prefix ? [identifier, prefix!].join(":"): identifier
        let stmts = this.sub_statements.get(key)
        if (stmts == undefined || stmts.length == 0) {
            throw new ParserError(`cardinality error: there should be 1..n ${key}`)
        }

        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    /**
     * Takes any sub-statements from `this` by the given `key` and
     * `prefix`. This method never fails.
     * 
     * @param idenfifier Identifier of the sub-statements.
     * @param prefix Prefix of the sub-statements.
     * @returns The sub-statements found.
     */
    takeZeroOrMore(idenfifier: string, prefix?: string): UnprocessedStatement[] {
        let key = prefix ? [idenfifier, prefix!].join(":"): idenfifier
        let stmts = this.sub_statements.get(key)
        this.sub_statements.delete(key)
        return stmts == undefined ? [] : stmts
    }

    /**
     * Ensure that all sub-statements and also the argument is already consumed
     * in `this`.
     */
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
     * This call will also make sure that the argument if fetched if needed. If
     * the argument or any sub-statements are not consumed at the end of the
     * function, it throws a ParserError
     * 
     * @param take_params defines what kind of sub-statements to expect and
     * fetch from `this`. Each element defines the identifier, the cardinality
     * and the prefix of the sub-statement that is to be taken.
     * 
     * @return A tuple with as many elements as many parameters the function took. The type of the element in the tuple depends on the input parameters:
     * - The `n`th input parameter (`take_params`) defines the type of the element in the
     * resulting array at position `n`.
     * - If cardinality is singular (`ZeroOrOne`, `One`), then the resulting
     * type of the element matches the result type of `parseFunc`.
     * - If cardinality is plural, the type of the tuple element will be an
     * array of `P`, where `P` is the result type of `parseFunc`.
     */
    takeAll<T extends TakeParam<any, Cardinality>[]>(...take_params: T): TakeResult<T> {
        let result: any[] = []

        take_params.forEach((v) => {
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
