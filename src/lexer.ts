
export class Token { }

export class PlusToken extends Token { }
export class CommentToken extends Token { }
export class WhiteSpaceToken extends Token { }
export class QuotedStringToken extends Token { 
    content: string

    constructor(content: string) {
        super()
        this.content = content
    }
}

export class BlockBeginToken extends Token { }
export class BlockEndToken extends Token { }
export class StringToken extends Token {
    content: string

    constructor(content: string) {
        super()
        this.content = content
    }
}
export class StatementEndToken extends Token { }
export class EndOfInputToken extends Token { }

export class LexerError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

export class Lexer {
    pos: number
    col: number
    row: number

    input: string

    saved_token: Token | null

    constructor(input: string) {
        this.pos = 0
        this.col = 0
        this.row = 0
        this.input = input
        this.saved_token = null
    }

    saveToken(t: Token) {
        this.saved_token = t
    }

    len(): number {
        return this.input.length - this.pos
    }

    getToken(): Token {
        let concat_str = false
        let str = ""
        let string_parsed = false

        if (this.saved_token != null) {
            let token = this.saved_token
            this.saved_token = null
            return token
        }

        for (; ;) {
            if (this.len() == 0) {
                if (string_parsed) {
                    return new StringToken(str)
                } else if (concat_str) {
                    return new LexerError("eof after + symbol")
                }

                return new EndOfInputToken()
            }

            let token = this.getSingleToken()

            switch (token.constructor) {
                case WhiteSpaceToken:
                case CommentToken:
                    break
                case PlusToken:
                    if (concat_str) {
                        return new LexerError("unexpected + symbol after + symbol")
                    }
                    concat_str = true
                    // continue with loop
                    break
                case QuotedStringToken:
                    let quotedToken = token as QuotedStringToken
                    if (!concat_str && str.length > 0) {
                        this.saveToken(token)
                        return new StringToken(quotedToken.content)
                    } else {
                        str += quotedToken.content
                        string_parsed = true
                        concat_str = false
                        // continue with loop
                    }
                    break
                default:
                    if (concat_str) {
                        return new LexerError("expected quoted string after + symbol")
                    }

                    if (string_parsed) {
                        this.saveToken(token)
                        return new StringToken(str)
                    }
                    return token
            }
        }
    }

    getSingleToken(): Token {

        let current_string = this.input.slice(this.pos)

        if (current_string[0].trim() == "") { // whitespace

            // find first non-shitespace character
            let i = 0
            for (; i < current_string.length; i++) {
                if (current_string[i].trim() != "") {
                    break
                }
            }

            this.pos += i
            let lines = current_string.slice(0, i).split("\n")
            this.col += lines[lines.length - 1].length
            this.row += lines.length - 1

            return new WhiteSpaceToken()
        } else if (current_string.startsWith("//")) {
            let comment_str = current_string.split("\n", 1)[0]
            this.pos += comment_str.length + 1 // +1 for the new line
            this.col = 0
            this.row++

            return new CommentToken()
        } else if (current_string.startsWith("/*")) {
            let end_pos = current_string.indexOf("*/")
            if (end_pos == -1) {
                return new LexerError("Missing end of block comment")
            }

            let block_comment = current_string.slice(0, end_pos + 2)
            this.pos += block_comment.length
            let lines = block_comment.split("\n")
            this.col = lines[lines.length - 1].length
            this.row += lines.length - 1

            return new CommentToken()
        } else if (current_string.startsWith(";")) {
            this.pos++
            this.col++
            return new StatementEndToken()
        } else if (current_string.startsWith("{")) {
            this.pos++
            this.col++
            return new BlockBeginToken()
        } else if (current_string.startsWith("}")) {
            this.pos++
            this.col++
            return new BlockEndToken()
        } else if (current_string.startsWith("+")) {
            this.pos++
            this.col++
            return new PlusToken()
        } else if (current_string.startsWith("'")) {
            let end_pos = current_string.indexOf("'")
            if (end_pos == -1) {
                return new LexerError("Missing end of quoted string")
            }

            current_string = current_string.slice(0, end_pos + 1)
            let lines = current_string.split("\n")
            this.col = lines[lines.length - 1].length
            this.row += lines.length - 1

            let result = current_string.slice(1, current_string.length - 1)
            return new QuotedStringToken(result)
        } else if (current_string.startsWith("\"")) {
            // NOTE: according to the rfc, the + sign can also be a part of
            // an unquoted string as a simple character, which means that theoretically this is a valid sequence of tokens:
            //
            // "quoted" +mystring
            // 
            // which supposed to be translated to two string tokens: `quoted` and `+mystring`.
            //
            // This use-case is so awkward though that this implemenation does not support it.
            //
            // On the other hand, the following lines:
            //
            // "quoted" +"mystring"
            //
            // is a valid concatenation of two double quoted strings.
            let escaped_string = ""
            let i = 1
            for (; ; i++) {
                if (i >= current_string.length) {
                    throw new LexerError("expected ending symbol for double quoted string")
                }

                if (current_string[i] == "\\") {
                    // escaped character 6.1.3
                    if (current_string.length < i - 1) {
                        throw new LexerError("\\ symbol just before EOF")
                    }

                    let c = current_string[i + 1]
                    switch (c) {
                        case "n":
                            escaped_string += "\n"
                            break
                        case "t":
                            escaped_string += "\t"
                            break
                        case "\"":
                            escaped_string += "\""
                            break
                        case "\\":
                            escaped_string += "\\"
                            break
                        default:
                            throw new LexerError("Invalid escaped character")
                    }
                } else if (current_string[i] == "\"") {
                    break
                } else {
                    escaped_string += current_string[i]
                }
            }
            let trimmed_string = trimSpaces(escaped_string, this.col + 1)

            this.pos += i + 1
            let lines = current_string.slice(0, i + 1).split("\n")
            this.col = lines[lines.length - 1].length
            this.row += lines.length - 1

            return new QuotedStringToken(trimmed_string)
        } else {
            // unquoted string
            let current_string = this.input.slice(this.pos)

            let i = 0
            for (; i < current_string.length; i++) {
                let c = current_string[i]
                if (c.trim() == "" || c == "\"" || c == "'" || c == ";" || c == "{" || c == "}") {
                    break
                }

                if (i < current_string.length - 1) {
                    if (current_string.slice(i, i + 2) == "//" || current_string.slice(i, i + 2) == "/*") {
                        break
                    }
                }
            }

            this.pos += i
            this.col += i
            return new StringToken(current_string.slice(0, i))
        }
    }

    takeQuotedString(): StringToken {
        let result = ""
        // if concat_str, we are just after a + symbol
        let concat_str = false

        for (; ;) {

            let current_string = this.input.slice(this.pos)
            if (current_string.startsWith("+")) {

                if (result.length == 0 || concat_str) {
                    throw new LexerError("unexpected + symbol")
                }
                this.pos += 1
                this.col += 1
                concat_str = true
            } else if (current_string.startsWith("'")) {
                if (result.length > 0 && !concat_str) {
                    throw new LexerError("two quoted strings after each other without concatenation")
                }

                let end_pos = current_string.indexOf("'")
                if (end_pos == -1) {
                    throw new LexerError("expected ' symbol after ' symbol to build a quoted string")
                }

                this.pos += end_pos + 1
                let last_newline_pos = current_string.lastIndexOf("\n")
                if (last_newline_pos == -1) {
                    this.col += end_pos + 1
                } else {
                    this.col = end_pos + 1 - last_newline_pos
                    this.row += (current_string.match("\n") || []).length
                }
                result += current_string.slice(1, end_pos)
                concat_str = false
            } else if (current_string.startsWith("\"")) {
                concat_str = false
            } else {
                // not a quoted string, nor a + sign
                if (concat_str) {
                    throw new LexerError("expected a quoted string after + cymbol")
                }

                // Note: empty quoted string is also fine
                return new StringToken(result)
            }

        } // end for
    }
}

function trimSpaces(input: string, indent: number): string {
    let result_lines: string[]= []

    input.split("\n").forEach((line, _) => {
        // count whitespaces
        let count = 0
        let i = 0
        for (; i < line.length; i++) {
            if (line[i] == " ") {
                count++
            } else if (line[i] == "\t") {
                count += 8
            } else if (line[i] == "\n") {
                result_lines.push("")
                return
            } else {
                break
            }
        }

        let result = ""
        if (count > indent) {
            result += " ".repeat(count - indent)
        }

        result += line.slice(i).trimEnd()
        result_lines.push(result)
    })

    return result_lines.join("\n")
}