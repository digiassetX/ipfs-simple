
const simple = require('../index');
const got=require("got");


const expect    = require("chai").expect;
simple.create();


describe("CID manipulation",function() {
    this.timeout(600000);
    it('cid to hash', async function () {
        let hash=simple.cidToHash("bafkreiepryq3bhkml44hrvioaszd5q56mufmctx4mnzxf5hozpmpfcr44m");
        expect(hash).to.equal("8f8e21b09d4c5f3878d50e04b23ec3be650ac14efc637372f4eecbd8f28a3ce3");
    });
    it('hash to cid', async function () {
        let hash=simple.hashToCid("8f8e21b09d4c5f3878d50e04b23ec3be650ac14efc637372f4eecbd8f28a3ce3");
        expect(hash).to.equal("bafkreiepryq3bhkml44hrvioaszd5q56mufmctx4mnzxf5hozpmpfcr44m");
    });
    it('connect to a node',async function() {
        let nodeList=(await got.get(`https://ipfs.digiassetx.com/nodes.json`, {
            responseType: "json"
        })).body;
        let count=0;
        for (let {id} of nodeList) {
            try {
                await simple.addPeer(id, 30000);  //try to connect to peer but give up after 30 sec
                count++;
            } catch (_) {
            }
        }
        expect(count).to.greaterThan(0);
    });
    it('pin digibyte logo',async function() {
        expect(await simple.pinAdd("QmSAcz2H7veyeuuSyACLkSj9ts9EWm1c9v7uTqbHynsVbj",60000)).to.equal(true);
    });
    it('return digibyte logo as buffer',async function() {
        let buffer=await simple.catBuffer("QmSAcz2H7veyeuuSyACLkSj9ts9EWm1c9v7uTqbHynsVbj");
        expect(buffer[0]).to.equal(137);
        expect(buffer[1]).to.equal(80);
        expect(buffer[2]).to.equal(78);
        expect(buffer[3]).to.equal(71);
        expect(buffer[4]).to.equal(13);
    });
    it('check digibyte logo is pinned',async function() {
        let pinned=await simple.checkPinned("QmSAcz2H7veyeuuSyACLkSj9ts9EWm1c9v7uTqbHynsVbj");
        expect(pinned).to.equal(true);
    });
    it('get size of digibyte logo',async function() {
        let size=await simple.getSize("QmSAcz2H7veyeuuSyACLkSj9ts9EWm1c9v7uTqbHynsVbj");
        expect(size).to.equal(103368);
    });
});