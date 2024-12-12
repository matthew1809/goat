import type { SolanaReadRequest, SolanaTransaction, SolanaWalletClient } from "@goat-sdk/core";
import { 
    Connection, 
    PublicKey, 
    TransactionMessage, 
    VersionedTransaction 
} from "@solana/web3.js";

export function createSolanaWalletFromDynamic(connection: Connection, signer: any): SolanaWalletClient {
    return {
        getAddress: () => signer.publicKey.toBase58(),
        getChain() {
            return {
                type: "solana",
            };
        },
        async signMessage(message: string) {
            const messageBytes = Buffer.from(message);
            const signature = await signer.signMessage(messageBytes);
            return {
                signature: Buffer.from(signature).toString("hex"),
            };
        },
        async sendTransaction({ instructions }: SolanaTransaction) {
            const latestBlockhash = await connection.getLatestBlockhash("confirmed");
            const message = new TransactionMessage({
                payerKey: signer.publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions,
            }).compileToV0Message();
            const transaction = new VersionedTransaction(message);

            transaction.sign([signer]);

            const txid = await connection.sendTransaction(transaction, {
                maxRetries: 5,
            });

            return {
                hash: txid,
            };
        },
        async read(request: SolanaReadRequest) {
            const { accountAddress } = request;
            const pubkey = new PublicKey(accountAddress);
            const accountInfo = await connection.getAccountInfo(pubkey);

            if (!accountInfo) {
                throw new Error(`Account ${accountAddress} not found`);
            }

            return {
                value: accountInfo,
            };
        },
        async balanceOf(address: string) {
            const pubkey = new PublicKey(address);
            const balance = await connection.getBalance(pubkey);

            return {
                decimals: 9,
                symbol: "SOL",
                name: "Solana",
                value: BigInt(balance),
            };
        },
    };
} 