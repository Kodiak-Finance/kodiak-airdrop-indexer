import { TypeormDatabase } from "@subsquid/typeorm-store";
import { CSVData, loadWhitelist } from "./utils/whitelist";
import { extractLogsFromBlock } from "./utils/extractLogsFromBlock";
import { decodeLogs } from "./utils/decodeLogs";
import { processor } from "./processor";
import { Prices } from "./utils/prices";
import {
    Account,
    BGTActivate,
    BGTRemove,
    Bundle,
    Token,
    Transfer,
    V2Pair,
    V2Swap,
    V3Pool,
    V3Swap,
} from "./model";
import { EntityManager } from "./utils/entityManager";
import { addresses } from "./constants";
import { ContractType } from "@kodiak-finance/address-manager";
import { bigintAbs } from "./utils/bigintAbs";
import { createToken } from "./utils/createToken";

const db = new TypeormDatabase({ supportHotBlocks: true });
let inited = false;

async function init(entities: EntityManager, wl: CSVData[]) {
    let bundle = await entities.get(Bundle, "1");
    if (!bundle) {
        bundle = new Bundle({ id: "1" });
        entities.add(bundle);

        for (const item of wl) {
            entities.add(new Account({ ...item }));
        }
        inited = true;
    }
}

loadWhitelist().then((csvData) => {
    const whitelist = csvData.map((data) => data.id);
    const prices = new Prices();
    prices.get(["0x286f1c3f0323db9c91d1e8f45c8df2d065ab5fae"]);

    processor.run(db, async (ctx) => {
        const entities = new EntityManager(ctx.store);
        entities.defer(Account, ...whitelist);
        await entities.load(Account);

        const prevInited = inited;
        if (!inited) {
            await init(entities, csvData);
        }
        const logs = extractLogsFromBlock(ctx);

        const {
            transfers,
            v2Pairs,
            v3Pools,
            v3Swaps,
            v2Swaps,
            delegates,
            undelegates,
        } = await decodeLogs(logs);
        prices.add(...transfers.map((transfer) => transfer._address));
        await prices.fetch();

        for (const pair of v2Pairs) {
            entities.add(
                new V2Pair({
                    id: pair.pair,
                    token0: pair.token0,
                    token1: pair.token1,
                    txnHash: pair._txHash,
                    block: pair._blockNumber,
                    timestamp: pair._timestamp,
                    origin: pair._origin,
                })
            );
        }

        for (const pool of v3Pools) {
            entities.add(
                new V3Pool({
                    id: pool.pool,
                    token0: pool.token0,
                    token1: pool.token1,
                    txnHash: pool._txHash,
                    block: pool._blockNumber,
                    feeTier: pool.fee,
                    timestamp: pool._timestamp,
                    origin: pool._origin,
                })
            );
        }

        entities.defer(V2Pair, ...v2Swaps.map(({ _address }) => _address));
        entities.defer(V3Pool, ...v3Swaps.map(({ _address }) => _address));

        await entities.load(V2Pair);
        await entities.load(V3Pool);

        prices.add(addresses.require(ContractType.KDK));

        await prices.fetch();

        // ------------------------- SWAPS -------------------------

        for (const swap of v2Swaps) {
            if (entities.get(V2Pair, swap._address, false) === undefined) {
                continue;
            }
            entities.add(
                new V2Swap({
                    id: swap._txHash + "-" + swap._logIndex,
                    block: swap._blockNumber,
                    pair: swap._address,
                    sender: swap.sender,
                    to: swap.to,
                    amount0In: swap.amount0In,
                    amount1In: swap.amount1In,
                    amount0Out: swap.amount0Out,
                    amount1Out: swap.amount1Out,
                    txnHash: swap._txHash,
                    timestamp: swap._timestamp,
                    origin: swap._origin,
                })
            );
            const v2Pair = entities.getOrFail(V2Pair, swap._address, false);
            await prices.get([v2Pair.token0, v2Pair.token1]);
            await createToken(entities, v2Pair.token0, prices);
            await createToken(entities, v2Pair.token1, prices);
        }
        for (const swap of v3Swaps) {
            if (entities.get(V3Pool, swap._address, false) === undefined) {
                continue;
            }
            const v3Pool = entities.getOrFail(V3Pool, swap._address, false);
            const p = await prices.get([v3Pool.token0, v3Pool.token1]);
            await createToken(entities, v3Pool.token0, prices);
            await createToken(entities, v3Pool.token1, prices);

            entities.add(
                new V3Swap({
                    id: swap._txHash + "-" + swap._logIndex,
                    block: swap._blockNumber,
                    pair: swap._address,
                    sender: swap.sender,
                    amount0In: swap.amount0 < 0n ? 0n : swap.amount0,
                    amount0Out:
                        swap.amount0 < 0n ? bigintAbs(swap.amount0) : 0n,
                    amount1In: swap.amount1 < 0n ? 0n : swap.amount1,
                    amount1Out:
                        swap.amount1 < 0n ? bigintAbs(swap.amount1) : 0n,
                    txnHash: swap._txHash,
                    to: swap.recipient,
                    timestamp: swap._timestamp,
                    origin: swap._origin,
                })
            );
        }
        // ------------------------- KDK/XKDK -------------------------

        for (const transfer of transfers) {
            entities.add(
                new Transfer({
                    id: transfer._txHash + "-" + transfer._logIndex,
                    block: transfer._blockNumber,
                    token: transfer._address,
                    from: transfer.from,
                    to: transfer.to,
                    value: transfer.value,
                    txnHash: transfer._txHash,
                    timestamp: transfer._timestamp,
                    origin: transfer._origin,
                })
            );
        }

        // ------------------------- DELEGATORS -------------------------

        for (const delegate of delegates) {
            entities.add(
                new BGTActivate({
                    id: delegate._txHash + "-" + delegate._logIndex,
                    sender: delegate.sender,
                    amount: delegate.amount,
                    block: delegate._blockNumber,
                    txnHash: delegate._txHash,
                    timestamp: delegate._timestamp,
                    origin: delegate._origin,
                })
            );
        }

        for (const delegate of undelegates) {
            entities.add(
                new BGTRemove({
                    id: delegate._txHash + "-" + delegate._logIndex,
                    sender: delegate.sender,
                    amount: delegate.amount,
                    block: delegate._blockNumber,
                    txnHash: delegate._txHash,
                    timestamp: delegate._timestamp,
                    origin: delegate._origin,
                })
            );
        }

        // ------------------------- SAVE -------------------------

        await ctx.store.save(entities.values(V2Pair));
        await ctx.store.save(entities.values(V3Pool));
        await ctx.store.save(entities.values(Bundle));
        await ctx.store.save(entities.values(Token));

        if (!prevInited) {
            await ctx.store.insert(entities.values(Account));
        }
        await ctx.store.insert(entities.values(Transfer));
        await ctx.store.insert(entities.values(V2Swap));
        await ctx.store.insert(entities.values(V3Swap));
        await ctx.store.insert(entities.values(BGTActivate));
        await ctx.store.insert(entities.values(BGTRemove));
    });
});
