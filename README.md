# dividend_share_bot
This script can be used to share dividend for STAKING your token like BROFund, TANGENT & etc in Hive-Engine.

***
## Installation
This is a nodejs based application.
```
npm install --save
```
***
## Configuration
```javascript
{
	"enabled" : true,					    //Set true to initiate dividend share process	
	"trigger" : {						    //Set UTC Time to initiate the process (Default 00:15am)		
		"hour" : 0,
		"minute" : 15
	},	
	"ssc_api" : "https://api.hive-engine.com/rpc",              //Hive-Engine Api Call
	"json_id" : "ssc-mainnet-hive",                             //Hive-Engine Json Id
	"staker_count" : 200,                                       //Number of stakers of the token
	"decimal" : 1000,
	"timeout" : 5000,
	"rec_timeout" : 1000,
	"he_timeout" : 9000,
	"block_timeout" : 9000,	
	"contract_setting" : {
		"token" : "",                                             //Add "Token Symbol" that you want to stake to share dividends
		"contract" : "tokens",		
		"table" : "balances",
		"limit" : 1000
	},
	"reward_pools_setting" : {
		"pools" : [
			//["TOKEN_NAME", 
                        // "IF SEND ENTIRE ACCOUNT TOKEN_BALANCE - SET balTrue, ELSE - SET balFalse",
                        // "PERCENTAGE YOU WANT TO SHARE - (DONT ADD % MARK)",
                        // "IF balFalse - DEFINE HOW MANY TOKENS YOU WISH TO SHARE",
                        // "IF mintTrue - IT WILL MINT PREVIOUSLY DEFINED TOKEN AMOUNT",
                        // "if availFalse - THIS TOKEN WILL NOT SHARE TO REWARD POOL",
                        // "TOKEN_SENDER_ACCOUNT_NAME",
                        // "TOKEN_SENDER_ACTIVE_KEY"]
     	//You can add tokens like below      
	["TOKEN_NAME_1", "balFalse", "100", "12", "mintFalse", "availTrue", "TOKEN_1_SENDER_NAME", "ACTIVE_KEYS"],
      	["TOKEN_NAME_2", "balTrue", "75", "", "mintFalse", "availTrue", "TOKEN_2_SENDER_NAME", "ACTIVE_KEYS"],
      	["TOKEN_NAME_3", "balFalse", "90", "50", "mintTrue", "availTrue", "TOKEN_3_SENDER_NAME", "ACTIVE_KEYS"]
		],
		"mint_setting" : {	                                            //If token mints to reward pool share, this will be used.		
			"contract" : "tokens",
			"action" : "issue",
			"event" : "transferFromContract",				
			"mint_memo" : "Mint {{tokensymbol}} Tokens To Reward Pool Share - ({{date}} / {{time}} Server Time)"
		},
		"reward_setting" : {
			"distributor_account" : "",                                   //Pool Rewards distributor account name
			"distributor_activekey" : "",                                 //Pool Rewards distributor account active keys 
			"contract" : "tokens",
			"action" : "transfer",
			"event" : "transfer",
			"reward_memo" : "Congratulations, Your Rank {{stakerrank}} & You Earned {{stakerreward}} {{tokensymbol}} For Staking {{staketokensymbol}}"
		},
		"balance_setting" : {
			"contract" : "tokens",
			"table" : "balances"
		}
	},
	"db_string" : "",                                                //Mongo Db Atlas - Connection Link
	"db_name" : "pooldb",
	"db_table_name" : "pooltb",
	"db_remove_days" : 7,                                           //Due to use of free cluster (500Mb) better define maximum days to keep pool reward sending data. 
	"rpc_nodes" : [
		"https://api.deathwing.me",
		"https://hive.roelandp.nl",
		"https://api.openhive.network",
		"https://rpc.ausbit.dev",
		"https://hived.emre.sh",
		"https://hive-api.arcange.eu",
		"https://api.hive.blog",
		"https://api.c0ff33a.uk",
		"https://rpc.ecency.com",
		"https://anyx.io",
		"https://techcoderx.com",
		"https://hived.privex.io",
		"https://api.followbtcnews.com/"
	]
}
```
***
## Execute
```
node app.js
```
***
## Development
Encounter any issue or Bugs, Please report them [Here](https://github.com/theguruscripts/dividend_share_bot/issues).

The Script Developed by @theguruasia on HIVE.BLOG, @TheGuruAsia theguruasia#8947 on Discord.
