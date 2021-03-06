const Parser = require('../../lib/parser');
const Tokenizer = require('../../lib/tokenizer');
const defaultTreeAdapter = require('../../lib/tree_adapters/default');
const testUtils = require('../../test/test_utils');

function appendToken(dest, token) {
    switch (token.type) {
        case Tokenizer.EOF_TOKEN:
            return false;

        case Tokenizer.NULL_CHARACTER_TOKEN:
        case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
            token.type = Tokenizer.CHARACTER_TOKEN;
        /* falls through */

        case Tokenizer.CHARACTER_TOKEN:
            if (dest.length > 0 && dest[dest.length - 1].type === Tokenizer.CHARACTER_TOKEN) {
                dest[dest.length - 1].chars += token.chars;

                return true;
            }
            break;
    }

    dest.push(token);

    return true;
}

function collectParserTokens(html) {
    const tokens = [];
    const parser = new Parser();

    parser._processInputToken = function (token) {
        Parser.prototype._processInputToken.call(this, token);

        // NOTE: Needed to split attributes of duplicate <html> and <body>
        // which are otherwise merged as per tree constructor spec
        if (token.type === Tokenizer.START_TAG_TOKEN)
            token.attrs = token.attrs.slice();

        appendToken(tokens, token);
    };

    parser.parse(html);

    return tokens.map(testUtils.convertTokenToHtml5Lib);
}

module.exports = function generateParserFeedbackTest(parserTestFile) {
    const tests = testUtils.parseTreeConstructionTestData(parserTestFile, defaultTreeAdapter);

    const feedbackTest = {
        tests: tests
            .filter(test =>!test.fragmentContext) // TODO
            .map(test => {
                const input = test.input;

                return {
                    description: testUtils.addSlashes(input),
                    input,
                    output: collectParserTokens(input)
                };
            })
    };

    return JSON.stringify(feedbackTest, null, 4);
};
