const { Hive } = require('@splinterlands/hive-interface');
const axios = require('axios');
const fs = require('fs');
const colors = require('colors');
const util = require('util');
const config = require('./config.json');
const { MongoClient } = require('mongodb');
const { HiveEngine } = require('@splinterlands/hive-interface');
let hive_engine = new HiveEngine();
const schedule = require('node-schedule');
const { upperCase, localeUpperCase } = require('upper-case');

const hiveio = require("@hiveio/hive-js");
hiveio.api.setOptions({url: "https://api.hive.blog"});
hiveio.config.set('alternative_api_endpoints', config.rpc_nodes);
 
const sscjs = require('sscjs');
var sscString = config.ssc_api;
var ssc = new sscjs(sscString);

const hive = new Hive({
  logging_level: 0,
  rpc_nodes: config.rpc_nodes
});

const TANTOKENSYMBOL = config.contract_setting.token;
const TANCONTRACT = config.contract_setting.contract;
const TANTABLE = config.contract_setting.table;

var TANLIMIT = config.contract_setting.limit;
TANLIMIT = parseInt(TANLIMIT) || 0;
var STAKERCOUNT = config.staker_count;
STAKERCOUNT = parseInt(STAKERCOUNT) || 0;
var DECIMAL = config.decimal;
DECIMAL = parseInt(DECIMAL) || 0;

var TIMEOUT = config.timeout;
TIMEOUT = parseInt(TIMEOUT) || 0;
var RECTIMEOUT = config.rec_timeout;
RECTIMEOUT = parseInt(RECTIMEOUT) || 0;
var HETIMEOUT = config.he_timeout;
HETIMEOUT = parseInt(HETIMEOUT) || 0;
var BLOCKTIMEOUT = config.block_timeout;
BLOCKTIMEOUT = parseInt(BLOCKTIMEOUT) || 0;

var DB_STRING = config.db_string;
var DB_NAME = config.db_name;
var DB_TABLE_NAME = config.db_table_name;

var JSONID = config.json_id;

var MINTCONTRACT = config.reward_pools_setting.mint_setting.contract;
var MINTACTION = config.reward_pools_setting.mint_setting.action;
var MINTEVENT = config.reward_pools_setting.mint_setting.event;
var REWARDERNAME = config.reward_pools_setting.reward_setting.distributor_account;
var REWARDERKEY = config.reward_pools_setting.reward_setting.distributor_activekey;

var REWARDCONTRACT = config.reward_pools_setting.reward_setting.contract;
var REWARDACTION = config.reward_pools_setting.reward_setting.action;
var REWARDEVENT = config.reward_pools_setting.reward_setting.event;

var BALANCECONTRACT = config.reward_pools_setting.balance_setting.contract;
var BALANCETABLE = config.reward_pools_setting.balance_setting.table;

var SUCCESSREMOVEDAYS = config.db_remove_days;
SUCCESSREMOVEDAYS = parseInt(SUCCESSREMOVEDAYS) || 0;

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const processStake = async() => {
	try
	{		
		var tokenBalance = await getTokenBalances();
		if(tokenBalance.length > 0)
		{
			var poolStatus = await poolProcess(tokenBalance);
			if(poolStatus == true)
			{
				console.log("POOL REWARD PROCESS FINISHED".green);
			}
			else
			{
				console.log("POOL REWARD PROCESS FINISHED".red);
			}				
		}
		else
		{
			console.log("NO STAKE BALANCE TO PROCEED".red);
		}
	}
	catch(error)
	{
		console.log("Error at processStake() : ", error);
	}
};

const poolProcess = async(tokenBalance) => {
	var trailStatus = false;
	try
	{
		var poolList = config.reward_pools_setting.pools;		
		if(poolList.length > 0)
		{
			async function recursive(n)
			{
				if (n <= poolList.length - 1) 
				{					
					var tokenName = upperCase(poolList[n][0]);
					var balanceStatus = poolList[n][1];
					var sharePercentage = poolList[n][2];
					sharePercentage = parseFloat(sharePercentage) || 0.0; 
					var tokenQty = poolList[n][3];
					tokenQty = parseFloat(tokenQty) || 0.0;
					var mintStatus = poolList[n][4];
					var availabilityStatus = poolList[n][5];
					var mintAccount = poolList[n][6];
					var mintKey = poolList[n][7];
					
					var totalTokenQty = tokenBalance[0].total;
					totalTokenQty = parseFloat(totalTokenQty) || 0.0;
					
					console.log("TOTAL : ", totalTokenQty);
					console.log("POOL NAME : ", tokenName);
					console.log("POOL QTY : ", tokenQty);
					console.log("POOL SHARE : ", sharePercentage, "%");
					
					if(availabilityStatus == "availTrue")
					{					
						if(balanceStatus == "balTrue")
						{
							var processStatus = await findProcessDataDb(tokenName);
							if(processStatus == true)
							{
								console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
								await timeout(RECTIMEOUT);
								await recursive(n + 1);
							}
							else
							{
								if(sharePercentage == 0.0)
								{
									console.log(tokenName.yellow, "SHARE PERCENATAGE IS ZERO".red);
									await timeout(RECTIMEOUT);
									await recursive(n + 1);	
								}
								else
								{
									var accBalance = await getTokenBalance(tokenName);
									if(accBalance > 0.0)
									{
										var rewarderData = await calcRewards(tokenBalance, accBalance, sharePercentage);
										if(rewarderData.length > 0)
										{
											var checkBalanceStatus = await checkTokenBalance(tokenName, accBalance, sharePercentage);
											if(checkBalanceStatus == true)
											{
												var transferStatus = await transPoolShare(rewarderData, tokenName);
												if(transferStatus == true)
												{
													console.log(tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
													var insertTransData = await insertOneTransDb(tokenName, accBalance);
													if(insertTransData == true)
													{
														console.log(tokenName, "POOL REWARD SUCCESSFULLY ADDED".yellow);
														await timeout(RECTIMEOUT);
														await recursive(n + 1);
													}
													else
													{
														console.log(tokenName, "POOL REWARD FAILED TO ADD TO DB".red);
														await timeout(RECTIMEOUT);
														await recursive(n + 1);
													}
												}
												else
												{
													console.log(tokenName, "POOL REWARD TRANSFER FAILED".red);
													await timeout(RECTIMEOUT);
													await recursive(n + 1);
												}
											}
											else
											{
												console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
											}
										}
										else
										{
											console.log(tokenName, "REWARDER CALCULATION FAILED".red);
											await timeout(RECTIMEOUT);
											await recursive(n + 1);
										}
									}
									else
									{
										console.log(tokenName.yellow, "TOKEN BALANCE IS ZERO".red);
										await timeout(RECTIMEOUT);
										await recursive(n + 1);
									}
								}
							}
						}
						else
						{
							if(mintStatus == "mintTrue")
							{
								if(tokenQty > 0.0)
								{
									var mintStatus = await findMintDataDb(tokenName);
									if(mintStatus == true)
									{
										console.log(tokenName, "TOKEN ALREADY MINTED".blue);									
										var processStatus = await findProcessDataDb(tokenName);
										if(processStatus == true)
										{
											console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
											await timeout(RECTIMEOUT);
											await recursive(n + 1);
										}
										else
										{
											var rewarderData = await calcRewards(tokenBalance, tokenQty, sharePercentage);
											if(rewarderData.length > 0)
											{
												var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty, sharePercentage);
												if(checkBalanceStatus == true)
												{
													var transferStatus = await transPoolShare(rewarderData, tokenName);
													if(transferStatus == true)
													{
														console.log(tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
														var updateTransData = await updateTransDb(tokenName);
														if(updateTransData == true)
														{
															console.log(tokenName, "POOL REWARD DB SUCCESSFULLY UPDATED".yellow);
															await timeout(RECTIMEOUT);
															await recursive(n + 1);
														}
														else
														{
															console.log(tokenName, "POOL REWARD DB UPDATE FAILED".red);
															await timeout(RECTIMEOUT);
															await recursive(n + 1);
														}
													}
													else
													{
														console.log(tokenName, "POOL REWARD TRANSFER FAILED".red);
														await timeout(RECTIMEOUT);
														await recursive(n + 1);
													}
												}
												else
												{
													console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
													await timeout(RECTIMEOUT);
													await recursive(n + 1);
												}
											}
											else
											{
												console.log(tokenName, "REWARDER CALCULATION FAILED".red);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
											}
										}
									}
									else
									{
										if(mintAccount != "" && mintKey != "")
										{
											var mintNewStatusData = await mintPoolToken(tokenName, tokenQty, mintAccount, mintKey);
											if(mintNewStatusData.length > 0)
											{
												var mintNewStatus = mintNewStatusData[0].mint_status;
												var mintTransactionId = mintNewStatusData[0].mint_id;
												
												if(mintNewStatus == true)
												{
													var insertMintData = await insertOneMintDb(mintTransactionId, mintNewStatus, tokenName, tokenQty); 
													if(insertMintData == true)
													{
														console.log(tokenName, "MINT TRANSACTION SUCCESSFULLY ADDED".yellow);
														var processStatus = await findProcessDataDb(tokenName);
														if(processStatus == true)
														{
															console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
															await timeout(RECTIMEOUT);
															await recursive(n + 1);
														}
														else
														{
															var rewarderData = await calcRewards(tokenBalance, tokenQty, sharePercentage);
															if(rewarderData.length > 0)
															{
																var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty, sharePercentage);
																if(checkBalanceStatus == true)
																{
																	var transferStatus = await transPoolShare(rewarderData, tokenName);
																	if(transferStatus == true)
																	{
																		var updateTransData = await updateTransDb(tokenName);
																		if(updateTransData == true)
																		{
																			console.log(tokenName, "POOL REWARD DB SUCCESSFULLY UPDATED".yellow);
																			await timeout(RECTIMEOUT);
																			await recursive(n + 1);
																		}
																		else
																		{
																			console.log(tokenName, "POOL REWARD DB UPDATE FAILED".red);
																			await timeout(RECTIMEOUT);
																			await recursive(n + 1);
																		}
																	}
																	else
																	{
																		console.log(tokenName, "POOL REWARD TRANSACTION FAILED".red);
																		await timeout(RECTIMEOUT);
																		await recursive(n + 1);
																	}
																}
																else
																{
																	console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
																	await timeout(RECTIMEOUT);
																	await recursive(n + 1);
																}
															}
															else
															{
																console.log(tokenName, "REWARDER CALCULATION FAILED".red);
																await timeout(RECTIMEOUT);
																await recursive(n + 1);
															}
														}
													}
													else
													{
														console.log(tokenName, "MINT TRANSACTION FAILED TO ADD TO DB".red);
														await timeout(RECTIMEOUT);
														await recursive(n + 1);
													}
												}
												else
												{
													console.log(tokenName, "MINT PROCESS FAILED".red);
													await timeout(RECTIMEOUT);
													await recursive(n + 1);
												}
											}
											else
											{
												console.log(tokenName, "MINT PROCESS LENGTH IS 0 (FAILED)".red);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
											}
										}
										else
										{
											console.log(tokenName, "USER & KEYS FAILED".red);
											await timeout(RECTIMEOUT);
											await recursive(n + 1);
										}
									}
								}
								else
								{
									console.log(tokenName, "DEFINED TOKEN QTY IS INCORRECT".red);
									await timeout(RECTIMEOUT);
									await recursive(n + 1);
								}
							}
							else
							{
								var rewarderData = await calcRewards(tokenBalance, tokenQty, sharePercentage);
								if(rewarderData.length > 0)
								{
									var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty, sharePercentage);
									if(checkBalanceStatus == true)
									{
										var transferStatus = await transPoolShare(rewarderData, tokenName);
										if(transferStatus == true)
										{
											console.log(tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
											var insertTransData = await insertOneTransDb(tokenName, tokenQty);
											if(insertTransData == true)
											{
												console.log(tokenName, "POOL REWARD SUCCESSFULLY ADDED".yellow);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
											}
											else
											{
												console.log(tokenName, "POOL REWARD FAILED TO ADD TO DB".red);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
											}
										}
										else
										{
											console.log(tokenName, "POOL REWARD TRANSFER FAILED".red);
											await timeout(RECTIMEOUT);
											await recursive(n + 1);
										}
									}
									else
									{
										console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
										await timeout(RECTIMEOUT);
										await recursive(n + 1);
									}
								}
								else
								{
									console.log(tokenName, "REWARDER CALCULATION FAILED".red);
									await timeout(RECTIMEOUT);
									await recursive(n + 1);
								}							
							}
						}
					}
					else
					{
						console.log(tokenName, "UNABLED TO SHARE REWARDS".red);
						await timeout(RECTIMEOUT);
						await recursive(n + 1);
					}
				}
				else
				{
					console.log("ALL POOLS PROCESSED".blue);
					trailStatus = true;
				}
			}
			await recursive(0);
		}
		return trailStatus;
	}
	catch(error)
	{
		console.log("Error at poolProcess() : ", error);
		return trailStatus;
	}
};

const getTokenBalances = async() => {
	var stakeArray = [];
	try
	{
		var tokenData = await processTokenBalance();
		var totalStake = 0.0;		
		if(tokenData.length > 0)
		{			
			const topStakers = tokenData.slice(0, STAKERCOUNT);
			for(i = 0; i < topStakers.length; i += 1)
			{
				totalStake += parseFloat(topStakers[i].stake) || 0.0;				
			}
			
			totalStake = Math.floor(totalStake * DECIMAL) / DECIMAL;
			
			for(i = 0; i < topStakers.length; i += 1)
			{				 
				var share = Math.floor((parseFloat(topStakers[i].stake) / totalStake) * DECIMAL) / DECIMAL;
				var ddata = {
					"rank" : i + 1,
					"account" : topStakers[i].account,
					"stake" : parseFloat(topStakers[i].stake) || 0.0,
					"share" : share,
					"total" : totalStake
				}
				stakeArray.push(ddata);
			}
			return stakeArray;	
		}
		else
		{
			console.log("NO STAKER DETAILS HERE".red);
			return stakeArray;	
		}
	}
	catch(error)
	{
		console.log("Error at getTokenBalances() : ", error);
		return stakeArray;
	}
};

const processTokenBalance = async() => {
	try
	{
		var balancesDetails = [];
		async function getBalances(n)
		{
			try
			{
				let result = await ssc.find(TANCONTRACT, TANTABLE, { symbol: TANTOKENSYMBOL }, TANLIMIT, n, []);
				
				if(result.length > 0)
				{
					console.log('RETRIEVING BALANCES...'.green);
					result.forEach(function(balance) 
					{
						balancesDetails.push(balance);
					});
					console.log('OFFSET VALUE : '.yellow, balancesDetails.length);			
					await getBalances(n + 1000);
				}
				else
				{
					console.log('');
					console.log('STARTED TOKEN BALANCES SORTING...'.green);
					balancesDetails.sort(function(a, b) 
					{			
						return parseFloat(b.stake) - parseFloat(a.stake);				
					});	
					
					console.log('TOKEN BALANCES HAVE BEEN SORTED'.blue);
					console.log('TOTAL TOKEN HOLDERS : '.yellow, balancesDetails.length);
				}
			}
			catch(error)
			{
				console.log("Error at getBalances() : ", error);				
			}			
		}
		await getBalances(0);
		return balancesDetails;	
	}
	catch(error)
	{
		console.log("Error at processTokenBalance() : ", error);
		return balancesDetails;	
	}
};

const mintPoolToken = async(TOKENSYMBOL, TOTALMINT, MINTACCNAME, MINTACTIVEKEY) => {
	var mintDataArray = [];
	try
	{
		var currentDate = new Date().toISOString().substr(0, 19);		
		var date = currentDate.substr(0,10);		
		var time = currentDate.substr(11,19);
		
		var memoTemp = config.reward_pools_setting.mint_setting.mint_memo;	
		var memo = memoTemp.replace('{{tokensymbol}}', TOKENSYMBOL).replace('{{date}}', date).replace('{{time}}', time);
		memo = memo.toString();	
		
		var transferObj = {
			contractName: MINTCONTRACT,
			contractAction: MINTACTION,
			contractPayload: {
				symbol: TOKENSYMBOL,
				to: REWARDERNAME,
				quantity: TOTALMINT.toFixed(3),
				memo: memo
			}
		}
			
		let mintTrans = await hive.custom_json(JSONID, transferObj, MINTACCNAME, MINTACTIVEKEY, true);
		console.log("MINT TRANS : ", mintTrans);			
		await timeout(HETIMEOUT);		
		if(mintTrans.id != "") 
		{
			console.log(TOKENSYMBOL.yellow, " MINTED SUCCESSFULLY".blue);			
			var ddata = {
				"mint_id" : mintTrans.id,
				"mint_status" : true
			};
			mintDataArray.push(ddata);	
		}
		else
		{
			console.log(TOKENSYMBOL.yellow, " MINT FAILED".red);
			var mintId = 0;
			var ddata = {
				"mint_id" : mintId,
				"mint_status" : false
			};
			mintDataArray.push(ddata);
		}
		return mintDataArray;		
	}
	catch(error)
	{
		console.log("Error at mintRewardToken() : ", error);
		var mintId = 0;
		var ddata = {
			"mint_id" : mintId,
			"mint_status" : false
		};
		mintDataArray.push(ddata);
		return mintStatus;
	}
};

const findMintDataDb = async(tokenName) => {
	var findStatus = false;
	try
	{
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);
		
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {			
			tokenName : tokenName,
			mintStatus : true,			
			dateTimeStamp : dateTimeStamp
		}
				
		const result = await table.find(findQuery).toArray();
		client.close();
		
		if(result.length > 0)
		{
			findStatus = true;	
		}		
		return findStatus;
	}
	catch(error)
	{
		console.log("Error at findMintDataDb() : ", error);
		return findStatus;
	}
};

const insertOneMintDb = async(transactionId, mintStatus, tokenName, tokenQty) => {
	var insertStatus = false; 
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);
		
		var timeNow = new Date().toISOString().substr(0, 19);
		var timeStampNow = await getTimeStamp(timeNow);		
		var dateTimeStamp = await getDateTimeStamp();
		
		var insertJson = {
			"mintId" : transactionId,
			"mintStatus" : mintStatus,
			"tokenName" : tokenName,
			"tokenQty" : tokenQty,
			"mintTime" : timeNow,
			"mintTimeStamp" : timeStampNow,			
			"rewardStatus" : false,
			"rewardTime" : "",
			"rewardTimeStamp" : 0,
			"dateTimeStamp" : dateTimeStamp
		}	
		
		const result = await table.insertOne(insertJson);
		client.close();	
		
		if(result.acknowledged == true)
		{			
			insertStatus = true;
		}	
		return insertStatus;				
	}
	catch(error)	
	{
		console.log("Error at insertOneMintDb() : ", error);
		return insertStatus;
	}
};

const findProcessDataDb = async(tokenName) => {
	var findStatus = false;
	try
	{
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);
		
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {
			tokenName : tokenName,
			rewardStatus : true,	
			dateTimeStamp : dateTimeStamp
		}
				
		const result = await table.find(findQuery).toArray();
		client.close();
		
		if(result.length > 0)
		{
			findStatus = true;
		}		
		return findStatus;
	}
	catch(error)
	{
		console.log("Error at findProcessDataDb() : ", error);
		return findStatus;
	}
};

const checkTokenBalance = async(TOKENSYMBOL, tokenQty, sharePercentage) => {
	var balanceStatus = false;
	try
	{
		let result = await ssc.findOne(BALANCECONTRACT, BALANCETABLE, { account: REWARDERNAME, symbol: TOKENSYMBOL });		
		if(result != null)
		{
			var tokenBalance = parseFloat(result.balance) || 0.0;
			var shareQty = Math.floor((tokenQty * sharePercentage / 100) * DECIMAL) / DECIMAL;
			if(tokenBalance >= shareQty)
			{
				balanceStatus = true;
			}	
		}
		return balanceStatus;
	}
	catch(error)
	{
		console.log("Error at checkTokenBalance() : ", error);
		return balanceStatus;
	}
};

const calcRewards = async(stakerBalance, tokenQty, sharePercentage) => {
	var jsonArray = [];
	try
	{
		if(stakerBalance.length > 0)
		{
			for(i = 0; i < stakerBalance.length; i += 1)
			{
				var poolShare = Math.floor((parseFloat(stakerBalance[i].share) * tokenQty * (sharePercentage / 100)) * DECIMAL) / DECIMAL;
				if(poolShare > 0.0)
				{
					var ddata = {
						"rank" : stakerBalance[i].rank,
						"account" : stakerBalance[i].account,
						"stake" : parseFloat(stakerBalance[i].stake) || 0.0,
						"share" : parseFloat(stakerBalance[i].share) || 0.0,
						"total" : parseFloat(stakerBalance[i].total) || 0.0,
						"pool" : poolShare
					}
					jsonArray.push(ddata);
				}
			}
			return jsonArray;
		}
		else
		{
			console.log("NO STAKER DETAILS HERE".red);
			return jsonArray;	
		}
	}
	catch(error)
	{
		console.log("Error at calcRewards() : ", error);
		return jsonArray;
	}
};

const transPoolShare = async(rewardData, TOKENSYMBOL) => {
	var transStatus = false;
	try
	{
		const txs = [];
		let section = 0;
		let id = 1;
		
		console.log("TOTAL STAKER LENGTH : ".blue, rewardData.length);
		for(i = 0; i < rewardData.length; i += 1) 
		{
			var stakeRank = rewardData[i].rank.toString();
			var stakerReward = rewardData[i].pool.toFixed(3);
			
			var memoTemp = config.reward_pools_setting.reward_setting.reward_memo;	
			var stakeMemo = memoTemp.replace('{{stakerrank}}', stakeRank)
			.replace('{{stakerreward}}', stakerReward)
			.replace('{{tokensymbol}}', TOKENSYMBOL)
			.replace('{{staketokensymbol}}', TANTOKENSYMBOL);
			stakeMemo = stakeMemo.toString();
			
			var stakerName = rewardData[i].account;
			
			const obj = {
				contractName: REWARDCONTRACT,
				contractAction: REWARDACTION,
				contractPayload: {
					symbol: TOKENSYMBOL,
					to: stakerName,
					quantity: stakerReward,
					memo: stakeMemo
				}
			}
			
			if (id > 0 && id % 19 === 0) section += 1;
			if (!txs[section]) txs[section] = [];
			txs[section].push(obj);
			id += 1;
		}
		if (txs.length > 0) 
		{	
			for (let j = 0; j < txs.length; j += 1) 
			{				
				let stakerTrans = await hive.custom_json(JSONID, txs[j], REWARDERNAME, REWARDERKEY, true);
				console.log("STAKER TRANS : ", stakerTrans);
				if(stakerTrans.id != "")
				{
					console.log("STAKER SHARE ".yellow + j + " SENT SUCCESSFULLY".green);
					console.log("TRANSACTION ID : ".green, stakerTrans.id);
				}				
				await timeout(BLOCKTIMEOUT);				
			}
			transStatus = true;
		}
		else
		{
			console.log("NO STAKER REWARDS TO SHARE".red);			
		}
		return transStatus;		
	}
	catch(error)
	{
		console.log("Error at transPoolShare() : ", error);
		return transStatus;		
	}
};

const updateTransDb = async(tokenName) => {
	var updateStatus = false;
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);
		
		var timeNow = new Date().toISOString().substr(0, 19);
		var timeStampNow = await getTimeStamp(timeNow);		
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {
			tokenName : tokenName,
			rewardStatus : false,
			dateTimeStamp : dateTimeStamp
		};

		var updateQuery = {
			"$set": {
				rewardStatus : true,
				rewardTime : timeNow,
				rewardTimeStamp : timeStampNow
			}
		};

		const options = { 
			returnNewDocument: true 
		};	
		
		const result = await table.findOneAndUpdate(findQuery, updateQuery, options);
		client.close();	
		
		if(result.ok == 1)
		{
			updateStatus = true;
		}		
		return updateStatus;	
	}
	catch(error)	
	{
		console.log("Error at updateTransDb() : ", error);
		return updateStatus;
	}
};

const insertOneTransDb = async(tokenName, tokenQty) => {
	var insertStatus = false; 
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);
		
		var timeNow = new Date().toISOString().substr(0, 19);
		var timeStampNow = await getTimeStamp(timeNow);		
		var dateTimeStamp = await getDateTimeStamp();
		
		var insertJson = {
			"mintId" : 0,
			"mintStatus" : false,
			"tokenName" : tokenName,
			"tokenQty" : tokenQty,
			"mintTime" : "",
			"mintTimeStamp" : 0,			
			"rewardStatus" : true,
			"rewardTime" : timeNow,
			"rewardTimeStamp" : timeStampNow,
			"dateTimeStamp" : dateTimeStamp
		}	
		
		const result = await table.insertOne(insertJson);
		client.close();	
		
		if(result.acknowledged == true)
		{			
			insertStatus = true;
		}	
		return insertStatus;				
	}
	catch(error)	
	{
		console.log("Error at insertOneTransDb() : ", error);
		return insertStatus;
	}
};

const getDateTimeStamp = async() => {
	try
	{
		var dateOnly = new Date().toISOString().slice(0,11);		
		var dateOnlyISO = dateOnly + '00:00:00.000Z';
		var timeISODate = new Date(dateOnlyISO);
		var timeISOMilSec = timeISODate.getTime();
		
		var timeStamp = parseInt(timeISOMilSec);
		
		return timeStamp;
	}
	catch(error)
	{
		console.log("Error at getDateTimeStamp() : ", error);
	}
};

const getTimeStamp = async(blockTime) => {
	try
	{
		var timeISO = blockTime + '.000Z';		
		var timeISODate = new Date(timeISO);
		var timeISOMilSec = timeISODate.getTime();		
		var timeStamp = parseInt(timeISOMilSec);		
		return timeStamp;
	}
	catch(error)
	{
		console.log("Error at getTimeStamp() : ", error);
	}
};

const deleteTransDb = async() => {
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_NAME);

		var currentTimeStamp = new Date().getTime();
		var maxRemoveDays = SUCCESSREMOVEDAYS * 86400000;
		var maxRemoveTime = currentTimeStamp - maxRemoveDays;
		
		var findQuery = {
			dateTimeStamp : { $lte:(maxRemoveTime)}
		};	
		
		const result = await table.deleteMany(findQuery);
		
		console.log(result.deletedCount, " DETAILS SUCCESSFULLY DELETED".blue);
		
		client.close();				
	}
	catch(error)	
	{
		console.log("Error at deleteTransDb() : ", error);
	}
};

const getTokenBalance = async(TOKENSYMBOL) => {
	var tokenBalance = 0.0;
	try
	{
		let result = await ssc.findOne(BALANCECONTRACT, BALANCETABLE, { account: REWARDERNAME, symbol: TOKENSYMBOL });		
		if(result != null)
		{
			tokenBalance = parseFloat(result.balance) || 0.0;
			tokenBalance = tokenBalance.toFixed(8);
			tokenBalance = parseFloat(result.balance) || 0.0;
		}
		return tokenBalance;
	}
	catch(error)
	{
		console.log("Error at getTokenBalance() : ", error);
		return tokenBalance;
	}
};

processStake();
deleteTransDb();