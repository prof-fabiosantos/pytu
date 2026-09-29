import test from 'node:test';
import assert from 'node:assert/strict';
import {writeEtag} from '../cloud.mjs';
test('Blob: ETag fraco de leitura é convertido para escrita condicional',()=>{assert.equal(writeEtag('W/"0a74c0b60ec1b9a2e63cdcaab332cd44"'),'"0a74c0b60ec1b9a2e63cdcaab332cd44"');assert.equal(writeEtag('"abc"'),'"abc"');assert.equal(writeEtag(undefined),undefined);assert.notEqual(writeEtag('W/"abc"'),writeEtag('W/"def"'));});
