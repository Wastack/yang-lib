

import * as mocha from 'mocha';
import * as chai from 'chai';
import { Identifier, ParserError, UnprocessedStatement } from './unprocessed_stmt';
import { LeafListStmt, LeafStmt, MustStmt, OrderedByStmt, StatusStmt, WhenStmt } from './stmt';

const expect = chai.expect;
describe(`Yang Parser`, () => {
    let good_must: UnprocessedStatement
    let good_leaf: UnprocessedStatement
    let good_leaf_list: UnprocessedStatement

    beforeEach(() => {
        good_must = new UnprocessedStatement(new Identifier("must"), undefined, "2 > 4")
        good_must.add(new UnprocessedStatement(new Identifier("error-message"), undefined, "this is my error message"))
        good_must.add(new UnprocessedStatement(new Identifier("description"), undefined, "this is my description"))

        good_leaf  = new UnprocessedStatement(new Identifier("leaf"), undefined, "identifier")
        good_leaf.add(new UnprocessedStatement(new Identifier("if-feature"), undefined, "2 > 4"))
        good_leaf.add(new UnprocessedStatement(new Identifier("if-feature"), undefined, "3 > 4"))
        good_leaf.add(good_must)
        good_leaf.add(new UnprocessedStatement(new Identifier("type"), undefined, "TODO"))
        good_leaf.add(new UnprocessedStatement(new Identifier("status"), undefined, "obsolete"))
        good_leaf.add(new UnprocessedStatement(new Identifier("config"), undefined, "false"))

        good_leaf_list  = new UnprocessedStatement(new Identifier("leaf-list"), undefined, "leaflist")
        good_leaf_list.add(new UnprocessedStatement(new Identifier("type"), undefined, "TODO"))
        good_leaf_list.add(new UnprocessedStatement(new Identifier("min-elements"), undefined, "+34"))
        good_leaf_list.add(new UnprocessedStatement(new Identifier("max-elements"), undefined, "53"))
        good_leaf_list.add(new UnprocessedStatement(new Identifier("ordered-by"), undefined, "system"))
        good_leaf_list.add(good_must)
    })

    it(`good 'must' statement`, () => {

        let must = MustStmt.parse(good_must)
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
        expect(must.arg).to.eq("2 > 4")
        expect(must.description).to.eq("this is my description")
        expect(must.error_message).to.eq("this is my error message")
        expect(must.error_app_tag).to.eq("tag")
        expect(must.reference).to.eq("ref")
    })

    it(`bad 'must' statement`, () => {
        // missing argument
        let unp = new UnprocessedStatement(new Identifier("must"))
        expect(() => MustStmt.parse(unp)).to.throw(ParserError)
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
        expect(() => WhenStmt.parse(unp)).to.throw(ParserError)
    })

    it(`good 'leaf' statement`, () => {
        let leaf = LeafStmt.parse(good_leaf)
        // TODO type
        expect(leaf.must).to.have.lengthOf(1)
        expect(leaf.must[0].error_message).to.deep.eq("this is my error message")
        expect(leaf.identifier.content).to.eq("identifier")
        expect(leaf.config).to.be.false
        expect(leaf.mandatory).to.be.undefined
        expect(leaf.if_feature).to.have.lengthOf(2)
        expect(leaf.if_feature).to.contain("3 > 4")
        expect(leaf.status).to.eq(StatusStmt.obsolete)
    })

    it(`'leaf' statement with missing 'type'`, () => {
        good_leaf.sub_statements.get("type")!.pop()
        let bad_leaf = good_leaf
        expect(() => LeafStmt.parse(bad_leaf)).to.throw(ParserError)
    })

    it(`good 'leaf-list' statement`, () => {
        let leaf_list = LeafListStmt.parse(good_leaf_list)
        // TODO type
        expect(leaf_list.idenfifier.content).to.eq("leaflist")
        expect(leaf_list.config).to.be.undefined

        expect(leaf_list.min_elements).to.eq(34)
        expect(leaf_list.max_elements).to.eq(53)
        expect(leaf_list.ordered_by).to.eq(OrderedByStmt.system)
    })

    it(`'leaf-list' 'type' has prefix, wrongfully`, () => {
        let bad_leaf_list = good_leaf_list
        let type_stmt = bad_leaf_list.sub_statements.get("type")![0]
        bad_leaf_list.takeOne("type")
        type_stmt.prefix = "my-prefix"
        bad_leaf_list.add(type_stmt)

        expect(() => LeafListStmt.parse(bad_leaf_list)).to.throw(ParserError)
    })
})