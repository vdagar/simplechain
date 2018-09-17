
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

	// validate block
	validateBlock(blockHeight){
		// get block object
		let block = this.getBlock(blockHeight);
		// get block hash
		let blockHash = block.hash;
		// remove block hash to test block integrity
		block.hash = '';
		// generate block hash
		let validBlockHash = SHA256(JSON.stringify(block)).toString();
		// Compare
		if (blockHash===validBlockHash) {
			return true;
		} else {
			console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
			return false;
		}
	}

	// Validate blockchain
	validateChain(){
		let errorLog = [];
		for (var i = 0; i < this.chain.length-1; i++) {
			// validate block
			if (!this.validateBlock(i))errorLog.push(i);
			// compare blocks hash link
			let blockHash = this.chain[i].hash;
			let previousHash = this.chain[i+1].previousBlockHash;
			if (blockHash!==previousHash) {
				errorLog.push(i);
			}
		}
		if (errorLog.length>0) {
			console.log('Block errors = ' + errorLog.length);
			console.log('Blocks: '+errorLog);
		} else {
			console.log('No errors detected');
		}
	}
}
