

import * as mocha from 'mocha';
import * as chai from 'chai';
import { Identifier, UnprocessedStatement } from './unprocessed_stmt';
import { MustStmt, WhenStmt } from './stmt';

const expect = chai.expect;
describe(`Yang Parser`, () => {
    it(`good 'must' statement`, () => {
        let unp = new UnprocessedStatement(new Identifier("must"), undefined, "2 > 4")
        unp.add(new UnprocessedStatement(new Identifier("error-message"), undefined, "this is my error message"))
        unp.add(new UnprocessedStatement(new Identifier("description"), undefined, "this is my description"))

        let must = MustStmt.parse(unp)
        expect(must.arg).to.deep.eq("2 > 4")
        expect(must.description).to.deep.eq("this is my description")
        expect(must.error_message).to.deep.eq("this is my error message")
        expect(must.error_app_tag).to.deep.eq(undefined)
        expect(must.reference).to.deep.eq(undefined)
    })

    it(`full 'must' statement`, () => {
        let unp = new UnprocessedStatement(new Identifier("must"), undefined, "2 > 4")
        unp.add(new UnprocessedStatement(new Identifier("error-message"), undefined, "this is my error message"))
        unp.add(new UnprocessedStatement(new Identifier("description"), undefined, "this is my description"))
        unp.add(new UnprocessedStatement(new Identifier("error-app-tag"), undefined, "tag"))
        unp.add(new UnprocessedStatement(new Identifier("reference"), undefined, "ref"))

        let must = MustStmt.parse(unp)
        expect(must.arg).to.deep.eq("2 > 4")
        expect(must.description).to.deep.eq("this is my description")
        expect(must.error_message).to.deep.eq("this is my error message")
        expect(must.error_app_tag).to.deep.eq("tag")
        expect(must.reference).to.deep.eq("ref")
    })

    it(`bad 'must' statement`, () => {
        // missing argument
        let unp = new UnprocessedStatement(new Identifier("must"))
        expect(() => MustStmt.parse(unp)).to.throw()
    })

    it(`good 'when' statement`, () => {
        let unp = new UnprocessedStatement(new Identifier("when"), undefined, "2 > 4")
        unp.add(new UnprocessedStatement(new Identifier("description"), undefined, "this is my description"))
        unp.add(new UnprocessedStatement(new Identifier("reference"), undefined, "ref"))

        let when = WhenStmt.parse(unp)
        expect(when.arg).to.deep.eq("2 > 4")
        expect(when.description).to.deep.eq("this is my description")
        expect(when.reference).to.deep.eq("ref")
    })

    it(`extra unknown statement for 'when'`, () => {
        let unp = new UnprocessedStatement(new Identifier("when"), undefined, "2 > 4")
        unp.add(new UnprocessedStatement(new Identifier("fake"), undefined, "this is quite wrong"))
        expect(() => WhenStmt.parse(unp)).to.throw()
    })
})