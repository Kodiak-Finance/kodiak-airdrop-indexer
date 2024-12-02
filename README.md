## UPDATE 2 December 2024
```
While Kodiak’s RFA filtering criteria remain unchanged, we are only including addresses that earned at least 4 points (as outlined in the criteria in the original post below) to be eligible for the Testnet Allocation of RFA rewards granted by the Berachain Foundation. 

This is to ensure that rewards are concentrated and maximized for our community.

The total number of addresses meeting the 4-point threshold was 1,960. You can check the list of addresses and how many points each address got in the csv output here: https://github.com/Kodiak-Finance/kodiak-airdrop-indexer/blob/master/raw_output.csv

The eligibility snapshot for Kodiak's submission to the Berachain RFA program was taken on October 7, 2024, at 22:23:59 UTC (Block 5290000). Any activity, such as swaps or delegations, completed after this timestamp was not factored into the calculations.
Per the RFA program requirements, 10–15% of each protocol's allocation must be airdropped to testnet users of Berachain's Artio and bArtio testnets. Kodiak chose the maximum allocation of 15% for the Testnet Allocation.

Please note that this information pertains exclusively to Kodiak's RFA submission to the Berachain Foundation and is unrelated to any other airdrops or grants.
```
## Metholodogy
```bash
Kodiak wants to reward our most loyal users that provided us valuable feedback and interacted with our protocol during 
our testnet phases (on both Artio and bArtio)

We had over 500k users interacting with the protocol.  

In order to meaningfully reward our most engaged users and counteract obvious sybils, here is the eligibility criteria used.

Each user is rated up to 10 points.

Minimum requirement:
- Must have done at least 1 swap on Kodiak DEX
- Measured on-chain, counts even if done via smart contract / aggregator)

Points eligibility:
- Dex power-user | Did at least 10 swaps and $10k volume | 1 point | 20k users
- BGT delegator | Delegated at least 1 BGT to Kodiak validator (and at least 1 swap) | 1 point | 13k users 
- KDK community | Held at least 1 KDK or xKDK on bArtio (and at least 1 swap) | 2 points | 4.5k users
- Feedback provider | Provided meaningful feedback using our feedback form (post sybil filter, and at least 1 swap) |  3 points | 3.4k users
- Artio user | Provided feedback on Artio testnet | 3 points | 0.4k users

The points all stack, so a single user can have up to 10 points.

For some context, here are the user stats pre-filtering:
- At least one swap | 330k users
- All KDK holders with one swap (not filtered for > 1 KDK) | 212k users
- All BGT delegates with one swap (not filtered for > 1 BGT) | 44k users


As of our snapshot, here's the points distribution: 
 - 1 point   | 26888
 - 2 points  | 3980
 - 3 points  | 3183
 - 4 points  | 1090
 - 5 points  | 379
 - 6 points  | 218
 - 7 points  | 185
 - 8 points  | 34
 - 9 points  | 17
 - 10 points | 37

Then to convert points to share of airdrop, we convert on the basis of points^2, to maximally reward the most loyal users  


Our methodology is fully transparent and can be recreated by anyone using the code here!
 
```


## Kodiak airdrop indexer (how to recreate yourself)

Dependencies: Node.js, Docker.

Subsquid docs: https://docs.sqd.dev/

```bash
# 0. Install @subsquid/cli a.k.a. the sqd command globally
npm i -g @subsquid/cli
```

Since we can't publish users' personal data, you must put a corresponding feedback csv in the project root, whose columns will be of this type:
```csv
Timestamp,Email Address,Discord handle,Wallet Address,Features Used,How was your experience using Kodiak bArtio?,Bugs found? Please also submit discord ticket so images can be attached.,Telegram username,Project/Fund/Association?,Rate your experience (1-5),Bot?,Minute
```

```bash
# 1. Copy source.csv to project root
cp /path/to/your/source.csv ./source.csv
```

```bash
# 2. Npm install
npm install

# 3. Re-index and run database
npm run again # for mac
npm run again-win # for pc

# If it breaks midway:
node -r dotenv/config lib/main.js

# 4. Use PostGreSQL IDE of choice to query the data
# Database info:
# host: localhost
# port: 5432 (or whatever your docker is using to fwd the port, check Docker)
# user: postgres
# password: postgres
# database: squid 
airdrop_query.sql #for examples
```

