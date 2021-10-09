
const simple = require('../index');


const expect    = require("chai").expect;



describe("CID manipulation",function() {
    it('cid to hash', async function () {
        let hash=simple.cidToHash("bafkreiepryq3bhkml44hrvioaszd5q56mufmctx4mnzxf5hozpmpfcr44m");
        expect(hash).to.equal("8f8e21b09d4c5f3878d50e04b23ec3be650ac14efc637372f4eecbd8f28a3ce3");
    });
    it('hash to cid', async function () {
        let hash=simple.hashToCid("8f8e21b09d4c5f3878d50e04b23ec3be650ac14efc637372f4eecbd8f28a3ce3");
        expect(hash).to.equal("bafkreiepryq3bhkml44hrvioaszd5q56mufmctx4mnzxf5hozpmpfcr44m");
    });
});