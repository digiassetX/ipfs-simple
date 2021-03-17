const got=require('got');
const FormData = require('form-data');
const CID = require('cids');

class IPFS {
    /**
     * Creates the IPFS object.  Path can be changed with path setter
     */
    constructor() {
        this._base="http://127.0.0.1:5001/api/v0/";
    }

    /**
     * Sets the path to IPFS interface
     * @param {string}  path
     */
    set path(path) {
        this._base=path
    }

    /**
     * converts a cid in to a hash
     * @param {string}  cidString
     * @return {string}
     */
    cidToHash(cidString) {
        const cid = new CID(cidString);
        //get hash
        let hash = "";
        for (let i = 4; i < 36; i++) hash += cid.bytes[i].toString(16).padStart(2, '0');

        return hash;
    }

    /**
     * converts a hash in to a cid
     * @param {string}  hash
     * @return {string}
     */
    hashToCid(hash) {
        const hashPrefix = "1220";
        // noinspection JSCheckFunctionSignatures
        const cid = new CID(1, 'raw', Uint8Array.from(Buffer.from(hashPrefix + hash, 'hex')));
        return cid.toString();
    }

    /**
     * Pins a file returns if successful
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<boolean>}
     */
    async pinAdd(cid, timeout = 600000) {
        return new Promise(async (resolve, reject) => {
            //handle timeouts
            let timer = setTimeout(() => {
                reject("get size of " + cid + " timed out");
            }, timeout);

            //get desired stats
            let url = this._base + 'pin/add/' + cid;
            await got.post(url);

            //clear timeout and return
            clearInterval(timer);
            return true;
        });
    }

    /**
     * Returns the data in an object
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<string>}
     */
    async cat(cid, timeout = 600000) {
        return new Promise(async (resolve, reject) => {
            //handle timeouts
            let timer = setTimeout(() => {
                reject("cat " + cid + " timed out");
            }, timeout);

            //get desired stats
            let url = this._base + 'cat/' + cid;
            let response=(await got.post(url)).body;

            //clear timeout and return
            clearInterval(timer);
            resolve(response);
        });
    }

    /**
     * Returns the json data in an object
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<{}>}
     */
    async catJSON(cid, timeout = 600000) {
        return JSON.parse(await this.cat(cid,timeout));
    }


    /**
     * Adds a json file and returns its cid
     * @param {{}}  json
     * @return {Promise<string>}
     */
    async addRawJSON(json) {
        let form = new FormData();
        form.append('path', Buffer.from(JSON.stringify(json), 'utf8'));

        let url = this._base + 'add?pin=true&raw-leaves=true&hash=sha2-256';
        let response = (await got.post(url, {
            headers: form.getHeaders(),
            body: form
        })).body;
        return JSON.parse(response).Hash;
    }


    /**
     * Returns if a cid is pinned or not
     * @param {string}  cid
     * @return {Promise<boolean>}
     */
    async checkPinned(cid) {
        let url = this._base + 'pin/ls/' + cid;
        let response = JSON.parse((await got.post(url)).body);
        return (response.Type === undefined); //Type will equal "error" if not pinned and be not present if pinned
    }

    /**
     * Gets the size of an object
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<int>}
     */
    async getSize(cid, timeout = 600000) {
        return new Promise(async (resolve, reject) => {
            //handle timeouts
            let timer = setTimeout(() => {
                reject("get size of " + cid + " timed out");
            }, timeout);

            //get desired stats
            let url = this._base + 'object/stat/' + cid;
            /** @type {{NumLinks:int,BlockSize:int,LinksSize:int,DataSize:int,CumulativeSize:int}}*/
            let response = JSON.parse((await got.post(url)).body);

            //clear timeout and return
            clearInterval(timer);
            resolve(response.CumulativeSize);
        });
    }
}


const singularity=new IPFS();
module.exports=singularity;