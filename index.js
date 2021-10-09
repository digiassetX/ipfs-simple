const got=require('got');
const FormData = require('form-data');
const {CID} = require('multiformats');

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
        const cid = CID.parse(cidString);
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
        const cid = CID.create(1, 0x55, {
            bytes: Uint8Array.from(Buffer.from(hashPrefix + hash, 'hex'))
        });
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
            let response=await got.post(url);
            let {Pins}=JSON.parse(response.body);

            //clear timeout and return
            clearInterval(timer);
            resolve(Pins[0]===cid);
        });
    }

    /**
     * Removes the pin on a file
     * @param cid
     * @return {Promise<void>}
     */
    async pinRemove(cid) {
        //get desired stats
        let url = this._base + 'pin/rm/' + cid;
        await got.post(url);
    }

    /**
     * Returns the data in an object
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<Buffer>}
     */
    async catBuffer(cid, timeout = 600000) {
        return new Promise(async (resolve, reject) => {
            //handle timeouts
            let timer = setTimeout(() => {
                reject("cat " + cid + " timed out");
            }, timeout);

            //get desired stats
            try {
                let url = this._base + 'cat/' + cid;
                let response = (await got.post(url,{
                    responseType:"buffer"
                })).body;
                resolve(response);
            } catch (e) {
                reject(e);
            }

            //clear timeout and return
            clearInterval(timer);
        });
    }

    /**
     * Returns the data in an object
     * @param {string}  cid
     * @param {int}     timeout
     * @return {Promise<string>}
     */
    async cat(cid, timeout = 600000) {
        return (await this.catBuffer(cid,timeout)).toString();
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
     * Adds a json file and returns its cid
     * @param {Buffer}  data
     * @return {Promise<string>}
     */
    async addBuffer(data) {
        let form = new FormData();
        form.append('path', data);

        let url = this._base + 'add?pin=true&hash=sha2-256';
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
     * returns a list of all pinned cids
     * @return {Promise<string[]>}
     */
    async listPinned() {
        let url= this._base + 'pin/ls';
        let response = JSON.parse((await got.post(url)).body);
        // noinspection JSUnresolvedVariable
        return response.Keys;
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

    async addPeer(location, timeout = 600000) {
        return new Promise(async (resolve, reject) => {
            //handle timeouts
            let timer = setTimeout(() => {
                reject("connecting to peer " + location + " timed out");
            }, timeout);

            //get desired stats
            let url = this._base + 'swarm/connect?arg=' + location;
            let response = JSON.parse((await got.post(url)).body);

            //clear timeout and return
            clearInterval(timer);
            // noinspection JSUnresolvedVariable
            resolve(response.Strings[0].endsWith("success"));
        });
    }

    async getId() {
        return new Promise(async (resolve, reject) => {
            let url = this._base + 'id';
            let response = JSON.parse((await got.post(url)).body);
            resolve(response);
        });
    }
}


const singularity=new IPFS();
module.exports=singularity;