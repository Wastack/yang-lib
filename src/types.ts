import { convertPositiveNumber } from "./stmt";
import { Cardinality, Identifier, ParserError, TakeParam, UnprocessedStatement } from "./unprocessed_stmt";

export abstract class TypeStmt {
    abstract typeIdentifier(): string;

    static parseTypeStmt(unp: UnprocessedStatement): TypeStmt | unknown{
        let arg = unp.argumentOrError() as TypeIdentifier
        // NOTE: if there is a prefix, it will go to the default branch, which
        // is good
        switch (arg) {
            case TypeIdentifier.BinaryType:
                return BinaryTypeStmt.parse(unp)
            case TypeIdentifier.BitsType:
                return BitTypeStmt.parse(unp)
            case TypeIdentifier.BooleanType:
                // TODO
                break
            case TypeIdentifier.Decimal64Type:
                // TODO
                break
            case TypeIdentifier.EmptyType:
                // TODO
                break
            case TypeIdentifier.EnumberationType:
                // TODO
                break
            case TypeIdentifier.IdentityrefType:
                // TODO
                break
            case TypeIdentifier.instanceIdentifierType:
                // TODO
                break
            case TypeIdentifier.LeafRefType:
                // TODO
                break
            case TypeIdentifier.StringType:
                // TODO
                break
            case TypeIdentifier.UnionType:
                // TODO
                break
            case TypeIdentifier.int8Type:
            case TypeIdentifier.Int16Type:
            case TypeIdentifier.Int32Type:
            case TypeIdentifier.Int64Type:
            case TypeIdentifier.UInt8Type:
            case TypeIdentifier.UInt16Type:
            case TypeIdentifier.UInt32Type:
            case TypeIdentifier.UInt64Type:
                // TODO
                break
            default:
                // TODO derived type
                break

        }
    }
}


export enum TypeIdentifier {
    BinaryType = "binary",
    BitsType = "bits",
    BooleanType = "boolean",
    Decimal64Type = "decimal64",
    EmptyType = "empty",
    EnumberationType = "enumeration",
    IdentityrefType = "identityref",
    instanceIdentifierType = "instance-identifier",
    int8Type = "int8",
    Int16Type = "int16",
    Int32Type = "int32",
    Int64Type = "int64",
    LeafRefType = "leafref",
    StringType = "string",
    UInt8Type = "uint8",
    UInt16Type = "uint16",
    UInt32Type = "uint32",
    UInt64Type = "uint64",
    UnionType = "union",
}

export class BitTypeStmt extends TypeStmt {
    typeIdentifier(): string {
        return "bits"
    }

    constructor(
        public bit: BitStmt[]
    ) {
        super();
    }

    static parse(unp: UnprocessedStatement): BitTypeStmt {
        if (unp.argumentOrError() != TypeIdentifier.BitsType) {
            throw new Error("internal: bits statement parsed with wrong identifier")
        }

        return new BitTypeStmt(
            ...unp.takeAll(
                new TakeParam("bit", Cardinality.ZeroOrMore, BitStmt.parse),
            ),
        )
    }
}

export class BitStmt {
    constructor(
        public name: Identifier,
        public position?: number,
    ) {
        if (this.position !== undefined && this.position < 0) {
            throw new ParserError("negative bit position is invalid")
        }
    }

    static parse(unp: UnprocessedStatement): BitStmt {
        return new BitStmt(
            new Identifier(unp.argumentOrError()),
            ...unp.takeAll(
                new TakeParam("position", Cardinality.ZeroOrOne, (u) => convertPositiveNumber(u.argumentOrError()))
            ),
        )
    }
}

export class BinaryTypeStmt extends TypeStmt {
    constructor(
        public length?: LengthStmt
    ) {
        super();
    }

    typeIdentifier(): string {
        return TypeIdentifier.BinaryType
    }

    static parse(unp: UnprocessedStatement): BinaryTypeStmt {
        if (unp.argumentOrError() != TypeIdentifier.BinaryType) {
            throw new Error("internal: binary statement parsed with wrong identifier")
        }

        return new BinaryTypeStmt(
            ...unp.takeAll(
                new TakeParam("length", Cardinality.ZeroOrOne, LengthStmt.parse)
            )
        )
    }
}

export class LengthStmt {
    constructor(
        public arg: LengthRestriction,

        public error_message?: string,
        public error_app_tag?: string,
        public description?: string,
        public reference?: string,
    ) {}

    static parse(unp: UnprocessedStatement): LengthStmt {
        return new LengthStmt(
            new LengthRestriction(unp.argumentOrError()),
            ...unp.takeAll(
                new TakeParam("error-message", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("error-app-tag", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("description", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
                new TakeParam("reference", Cardinality.ZeroOrOne, (u) => u.argumentOrError()),
            )
        )
    }
}

export class LengthRestriction {
    rules: LengthRange[]

    constructor(arg: string) {
        this.rules = []

        let rules = arg.split("|")
        rules.forEach((r) => {
            this.rules.push(new LengthRange(r))
        })
    }
}

export class LengthRange {
    lower_bound: number
    upper_bound: number

    constructor(text: string) {
        text = text.trim()

        let bounds = text.split("..", 2)
        if (bounds.length == 1) {
            let num = convertPositiveNumber(text)
            this.lower_bound = num
            this.upper_bound = num
        } else {
            this.lower_bound = convertPositiveNumber(bounds[0].trim())
            this.upper_bound = convertPositiveNumber(bounds[1].trim())
        }
    }
}