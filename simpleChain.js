
/**
 * CRITERIA: Configure simpleChain.js with levelDB to persist blockchain dataset using the level Node.js library.
 */

const leveldb	= require('./levelSandbox')
const Block	= require('./block');

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
	constructor() {
		/*
		 * CRITERIA : Genesis block persist as the first block in the blockchain using LevelDB
		 */

		this.blockHeight;
		this.getBlockHeight().then((height) => {
			this.blockHeight = height;
			if (height === -1) {
				this.addBlock(new Block("First block in the chain - Genesis block"));
			}

		}).catch(error => { console.log(error) });
	}

	/*
	 * CRITERIA : addBlock(newBlock) function includes a method to store newBlock with LevelDB.
	 */

	async addBlock(newBlock) {
		let res = '';
		// Block height
		newBlock.height = this.blockHeight + 1;

		// UTC timestamp
		newBlock.time = new Date().getTime().toString().slice(0,-3);

		// previous block hash
		if (newBlock.height > 0) {
			const prevBlock = await this.getBlock(this.blockHeight);
			newBlock.previousBlockHash = prevBlock.hash;
		}

		// Block hash with SHA256 using newBlock and converting to a string
		newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

		this.blockHeight = newBlock.height;

		// Adding block object to levelDB
		await leveldb.addBlockToLevelDB(newBlock.height, JSON.stringify(newBlock)).then((result) => {
			res = result ; }).catch(error => { res = error; });

		return res;
	}

	/*
	 * CRITERIA : Modify getBlockHeight() function to retrieve current block height within the LevelDB chain.
	 */
	async getBlockHeight() {
		return await leveldb.getBlockHeightFromLevelDB().then((height) => { return height; }).catch(error => { console.log(error); });
	}

	/*
	 * CRITERIA : Modify getBlock() function to retrieve a block by it's block heigh within the LevelDB chain.
	 */
	async getBlock(blockHeight) {
		// return object as a single string
		return JSON.parse(await leveldb.getBlockFromLevelDB(blockHeight).then((block) => {return block }).catch(error => { console.log(error); }));
	}

	/*
	 * CRITERIA : Modify the validateBlock() function to validate a block stored within levelDB
	 */
	async validateBlock(blockHeight) {
		// get block from level db
		let block = await this.getBlock(blockHeight);

		// save block hash
		let blockHash = block.hash;

		// remove block hash to test block integrity
		block.hash = '';

		// generate block hash
		let validBlockHash = SHA256(JSON.stringify(block)).toString();

		// Compare
		if (blockHash === validBlockHash) {
			//console.log(blockHash  + " === " + validBlockHash);
			return true;
		} else {
			console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
			return false;
		}
	}

	/*
	 * CRITERIA : Modify the validateChain() function to validate blockchain stored within levelDB
	 */
	async validateChain() {
		let isValid = false;
		let errorLog = [];
		let previousHash = '';
		let height = this.blockHeight;

		for (var i = 0; i <= height; i++) {
			try {throw i; }
			catch(count) {
				// validate block
				this.getBlock(count).then((block) => {

					//console.log("Validating block : " + count);

					if (!this.validateBlock(block.height)) {
						errorLog.push(block.height);
					}

					// compare blocks hash link
					if (block.previousBlockHash !== previousHash) {
						errorLog.push(block.height);
					}

					// save current block hash for comparision with next block's previous Hash
					previousHash = block.hash

					if (this.blockHeight === block.height) {
						console.log("BlockChain Validation completed \n");
						if (errorLog.length > 0) {
							console.log('Block errors = ' + errorLog.length);
							console.log('Blocks: ' + errorLog);
						} else {
							console.log('No errors detected\n\n');
						}
					}
				});
			}
		}


		// uncomment these 3 lines to display chain after its validated
		/*await leveldb.getChainFromLevelDB().then((blocks) => {
			console.log(blocks);
		}).catch(error => { console.log(error) });*/
	}
}

/* ================================= Testing ==================================|
|  - Self-invoking function to add blocks to chain                             |
|  - Learn more:                                                               |
|   https://scottiestech.info/2014/07/01/javascript-fun-looping-with-a-delay/  |
|                                                                              |
|  * 100 Milliseconds loop = 36,000 blocks per hour                            |
|     (13.89 hours for 500,000 blocks)                                         |
|    Bitcoin blockchain adds 8640 blocks per day                               |
|     ( new block every 10 minutes )                                           |
|  ===========================================================================*/

let blockchain = new Blockchain();

(function theLoop (i) {
	setTimeout(function () {
		let blockTest = new Block("Test Block - " + (i + 1));
		blockchain.addBlock(blockTest).then((result) => {
			console.log(result);
			i++;
			if (i < 10) theLoop(i);
		});
	}, 1000);
})(0);

setTimeout(() => console.log("\n\nValidating BlockChain...\n"), 15000);
setTimeout(() => blockchain.validateChain(), 20000);
