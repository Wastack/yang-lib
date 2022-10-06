import { BlockBeginToken, BlockEndToken, EndOfInputToken, Lexer, StatementEndToken, StringToken, Token } from './lexer';

import * as mocha from 'mocha';
import * as chai from 'chai';

const expect = chai.expect;
describe('Yang lexer', () => {

  it('should parse module { }', () => {
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
      
        // importing another module
        import ietf-yang-types { prefix yang; }
      
        typedef season {
          type string;
          description
            "The name of a sports season, including the type and the year, e.g,
             'Champions League 2014/2015'.";
        }
      
        /* Container nodes can hold arbitrary
        number of other yang nodes */

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
    while (!(current_token instanceof EndOfInputToken)) {
      count++
      current_token = lexer.getToken()
    }
    expect(count).to.eq(120)
  })

  it(`parses string before line comment`, () => {
    let lexer = new Lexer(`text // this is a comment
    text2
    `)

    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("text"))

    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("text2"))

    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

  it(`should parse string after block comment`, () => {
    let lexer = new Lexer(`/* comment */ text`)

    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("text"))

    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

  it(`parses multi line quoted string after multi line block comment`, () => {
    let lexer = new Lexer(`/* multi
    line comment */ "multi
                      line text"`)

    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("multi\n line text"))

    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

  it(`parses empty quoted string`, () => {
    let lexer = new Lexer(`identifier ""`)

    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("identifier"))
    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(""))
    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())

    lexer = new Lexer(`identifier " "`)

    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken("identifier"))
    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(""))
    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

  it(`parses crazy multi line `, () => {
    let lexer = new Lexer(`
/**/ "string1
    
       string2
    
   string3   " + "string4" `)

    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`string1\n\n string2\n\nstring3string4`))
  })

  it(`parses plus symbol in identifier`, () => {
    let lexer = new Lexer(`min-elements +32;`)
    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`min-elements`))

    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`+32`))

    token = lexer.getToken()
    expect(token).to.deep.eq(new StatementEndToken())

    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

  it(`parses crazy usages of + sybmol`, () => {
    let lexer = new Lexer(`"
"+++++""+""+`)
    let token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`\n`))
    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`+++++`))
    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(``))
    token = lexer.getToken()
    expect(token).to.deep.eq(new StringToken(`+`))
    token = lexer.getToken()
    expect(token).to.deep.eq(new EndOfInputToken())
  })

})