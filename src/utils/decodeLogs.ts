import * as erc20Abi from "../abi/erc20";
import * as v2FactoryAbi from "../abi/v2Factory";
import * as v3FactoryAbi from "../abi/v3Factory";
import * as v3PoolAbi from "../abi/v3Pool";
import * as v2PairAbi from "../abi/v2Pair";
import * as bgtAbi from "../abi/bgt";
import { EntityManager } from "./entityManager";
import { V2Pair, V3Pool } from "../model";
import { Bytes32 } from "@subsquid/evm-processor/lib/interfaces/base";

type DecodeLogRequirement = {
    topics: string[];
    address: string;
    transactionHash: string;
    block: {
        id: string;
        height: number;
        hash: Bytes32;
        parentHash: Bytes32;
        timestamp: number;
    };
    transaction?: {
        from: string;
    };
    logIndex: number;
};

type WithAddress<T> = {
    _txHash: string;
    _address: string;
    _blockNumber: number;
    _logIndex: number;
    _timestamp: number;
    _origin: string;
} & T;

export function wrapLog<T extends Object>(log: DecodeLogRequirement, data: T) {
    return {
        _address: log.address,
        _txHash: log.transactionHash,
        _blockNumber: log.block.height,
        _logIndex: log.logIndex,
        _timestamp: log.block.timestamp / 1000,
        _origin: log.transaction?.from!,
        ...data,
    } satisfies WithAddress<T>;
}

export async function decodeLogs<L extends DecodeLogRequirement>(logs: L[]) {
    const events = logs.reduce(
        (acc, log) => {
            switch (log.topics[0]) {
                case erc20Abi.events.Transfer.topic:
                    acc.transfers.push(
                        wrapLog(
                            log,
                            erc20Abi.events.Transfer.decode(log as any)
                        )
                    );
                    return acc;
                case v2FactoryAbi.events.PairCreated.topic:
                    acc.v2Pairs.push(
                        wrapLog(
                            log,
                            v2FactoryAbi.events.PairCreated.decode(log as any)
                        )
                    );
                    return acc;
                case v3FactoryAbi.events.PoolCreated.topic:
                    acc.v3Pools.push(
                        wrapLog(
                            log,
                            v3FactoryAbi.events.PoolCreated.decode(log as any)
                        )
                    );
                    return acc;
                case v2PairAbi.events.Swap.topic:
                    acc.v2Swaps.push(
                        wrapLog(log, v2PairAbi.events.Swap.decode(log as any))
                    );
                    return acc;
                case v3PoolAbi.events.Swap.topic:
                    acc.v3Swaps.push(
                        wrapLog(log, v3PoolAbi.events.Swap.decode(log as any))
                    );
                    return acc;

                case bgtAbi.events.ActivateBoost.topic:
                    acc.delegates.push(
                        wrapLog(
                            log,
                            bgtAbi.events.ActivateBoost.decode(log as any)
                        )
                    );
                    return acc;
                case bgtAbi.events.DropBoost.topic:
                    acc.undelegates.push(
                        wrapLog(log, bgtAbi.events.DropBoost.decode(log as any))
                    );
                    return acc;

                default:
                    throw new Error("Unknown log topic " + log.topics[0]);
            }
        },
        {
            transfers: [],
            v2Pairs: [],
            v3Pools: [],
            v2Swaps: [],
            v3Swaps: [],
            delegates: [],
            undelegates: [],
        } as {
            transfers: WithAddress<erc20Abi.TransferEventArgs>[];
            v2Pairs: WithAddress<v2FactoryAbi.PairCreatedEventArgs>[];
            v3Pools: WithAddress<v3FactoryAbi.PoolCreatedEventArgs>[];
            v2Swaps: WithAddress<v2PairAbi.SwapEventArgs>[];
            v3Swaps: WithAddress<v3PoolAbi.SwapEventArgs>[];
            delegates: WithAddress<bgtAbi.ActivateBoostEventArgs>[];
            undelegates: WithAddress<bgtAbi.DropBoostEventArgs>[];
        }
    );
    return {
        ...events,
        v2Swaps: events.v2Swaps,
        v3Swaps: events.v3Swaps,
    };
}
