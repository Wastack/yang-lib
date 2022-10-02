import { BlockBeginToken, BlockEndToken, EndOfInputToken, Lexer, StringToken } from './lexer';

import * as mocha from 'mocha';
import * as chai from 'chai';

const expect = chai.expect;
describe('Yang lexer', () => {

  it('should be able to add things correctly' , () => {
    let lexer = new Lexer(`module { }`)
    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("module"));
    token = lexer.getToken()
    expect(token).to.deep.eq(new BlockBeginToken());
    token = lexer.getToken()
    expect(token).to.deep.eq(new BlockEndToken());
    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken());
  });

});