

import * as mocha from 'mocha';
import * as chai from 'chai';
import { Identifier, UnprocessedStatement } from './unprocessed_stmt';
import { MustStmt } from './stmt';

const expect = chai.expect;
describe('Yang Parser', () => {
    it(`must statement`, () => {
        let unp = new UnprocessedStatement(new Identifier("must"), undefined, "2 > 4")
        unp.sub_statements.set("error-message", [new UnprocessedStatement(new Identifier("error-message"), undefined, "this is my error message")])
        unp.sub_statements.set("description", [new UnprocessedStatement(new Identifier("description"), undefined, "this is my description")])

        let must = MustStmt.parse(unp)
        expect(must.arg).to.deep.eq("2 > 4")
        expect(must.description).to.deep.eq("this is my description")
        expect(must.error_message).to.deep.eq("this is my error message")
        expect(must.error_app_tag).to.deep.eq(undefined)
    })

})