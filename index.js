const IPFS=require('ipfs-core');
const got=require('got');
const FormData = require('form-data');
const {CID} = require('multiformats');
const sleep=require("sleep-promise");

class IPFS_Simple {
    /**
     * Creates the IPFS object.  Path can be changed with path setter
     */
    constructor() {
        this._base="http://127.0.0.1:5001/api/v0/";
        this._coreMode=false;
        this._creating=false;
    }

    /**
     * Creates an IPFS objects instead of using path
     * @returns {Promise<void>}
     */
    async create() {
        this._creating=true;
        this._base=await IPFS.create();
        this._creating=false;
        this._coreMode=true;
    }

    /**
     * returns the objects core
     * @returns {string|IPFS}
     */
    get core() {
        return this._base;
    }

    /**
     * Sets up ipfs object to use a specific core
     * @param {string|IPFS} core
     * @returns {Promise<void>}
     */
    async init(core) {
        this._base=core;
        this._coreMode=(typeof core!=="string");
    }

    /**
     * Sets the path to IPFS interface
     * @deprecated
     * @param {string}  path
     */
    set path(path) {
        this._base=path;
        this._coreMode=false;
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            let response=await this._base.pin.add(CID.parse(cid),{timeout});
            return (response.toString()===cid);
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            await this._base.pin.rm(CID.parse(cid));
            return;
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            let chunks=[];
            for await (const chunk of this._base.cat(cid,{timeout})) {
                chunks.push(...chunk);
            }
            return Buffer.from(chunks);
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            let response=await this._base.add(Buffer.from(JSON.stringify(json), 'utf8'),{
                pin:        true,
                rawLeaves:  true,
                hashAlg:    'sha2-256'
            });
            return response.cid.toString();
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            let response=await this._base.add(data,{
                pin:        true,
                hashAlg:    'sha2-256'
            });
            return response.cid.toString();
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            for await (const response of this._base.pin.ls({
                paths: CID.parse(cid)
            })) {
                if (response.cid.toString()===cid) return true;
            }
            return false;
        }

        //Use IPFS Desktop
        let url = this._base + 'pin/ls/' + cid;
        let response = JSON.parse((await got.post(url)).body);
        return (response.Type === undefined); //Type will equal "error" if not pinned and be not present if pinned
    }

    /**
     * returns a list of all pinned cids
     * @return {Promise<string[]>}
     */
    async listPinned() {
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            let responses=[];
            for await (const { cid, type } of this._base.pin.ls()) {
                responses.push(cid.toString());
            }
            return responses;
        }

        //Use IPFS Desktop
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
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            try {
                let response = await this._base.object.stat(CID.parse(cid), {timeout});
                return response.CumulativeSize;
            } catch (e) {
                return (await this.catBuffer(cid)).length;
            }
        }

        //Use IPFS Desktop
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

    /**
     * Trys to connect to a peer
     * @param {string}  location
     * @param {int} timeout
     * @returns {Promise<void>}
     */
    async addPeer(location, timeout = 600000) {
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            await this._base.swarm.connect(location,{timeout});
            return;
        }

        //Use IPFS Desktop
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

    /**
     * Gets the id
     * Warning the core and desktop return in different formats
     * @returns {Promise<unknown>}
     */
    async getId() {
        //use IPFS core if initialized
        while (this._creating) await sleep(100);
        if (this._coreMode) {
            return this._base.id();
        }

        //Use IPFS Desktop
        return new Promise(async (resolve, reject) => {
            let url = this._base + 'id';
            let response = JSON.parse((await got.post(url)).body);
            resolve(response);
        });
    }
}


const singularity=new IPFS_Simple();
module.exports=singularity;