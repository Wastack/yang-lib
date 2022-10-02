import { BlockBeginToken, BlockEndToken, EndOfInputToken, Lexer, StatementEndToken, StringToken, Token } from './lexer';

import * as mocha from 'mocha';
import * as chai from 'chai';

const expect = chai.expect;
describe('Yang lexer', () => {

  it('should parse module { }' , () => {
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

  it(`should parse complex yang file`, () => {
    let lexer = new Lexer(`module example-sports {

        namespace "http://example.com/example-sports";
        prefix sports;
      
        import ietf-yang-types { prefix yang; }
      
        typedef season {
          type string;
          description
            "The name of a sports season, including the type and the year, e.g,
             'Champions League 2014/2015'.";
        }
      
        container sports {
          config true;
      
          list person {
            key name;
            leaf name { type string; }
            leaf birthday { type yang:date-and-time; mandatory true; }
          }
      
          list team {
            key name;
            leaf name { type string; }
            list player {
              key "name season";
              unique number;
              leaf name { type leafref { path "/sports/person/name"; }  }
              leaf season { type season; }
              leaf number { type uint16; mandatory true; }
              leaf scores { type uint16; default 0; }
            }
          }
        }
    }`)
     
    let current_token = lexer.getToken()
    let count = 0
    while(!(current_token instanceof EndOfInputToken))
    {
        count++
        current_token = lexer.getToken()
    }
    expect(count).to.eq(120)
  })



});