import * as Web3 from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config(); // Without this we will not be able to use process.env object

const PROGRAM_ID = new Web3.PublicKey("ChT1B39WKLS8qUrkLvFDXMhEJ4F1XZzwUNHUt4AU9aVa")
const PROGRAM_DATA_PUBLIC_KEY = new Web3.PublicKey("Ah9K7dQ8EHaZqcAsgBW8w37yN2eAy3koFmUn4x3CJtod")

async function main() {
    const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'));
    const signer = await initializeKeyPair(connection);
    // await pingProgram(connection, signer);
    await sendProgram(connection, signer);
    console.log("Public Key:", signer.publicKey.toBase58());
}

async function initializeKeyPair(
    connection : Web3.Connection
    ): Promise<Web3.Keypair>{
    if(!process.env.PRIVATE_KEY){
        console.log("Generating a private key!!!!");
        const signer = Web3.Keypair.generate();

        console.log("Creating .env file!!!");
        fs.writeFileSync('.env', `PRIVATE_KEY=[${signer.secretKey.toString()}]`);
        await airdropSolIfNeeded(signer, connection);
        return signer;
    }
    const secret = JSON.parse(process.env.PRIVATE_KEY ?? '') as number[]
    const secretKey = Uint8Array.from(secret);
    const keyPairFromSecret = Web3.Keypair.fromSecretKey(secretKey);
    await airdropSolIfNeeded(keyPairFromSecret, connection);
    return keyPairFromSecret;
}
    
async function airdropSolIfNeeded(
    signer : Web3.Keypair, 
    connection : Web3.Connection){
        const balance = await connection.getBalance(signer.publicKey);
        console.log('Current balance is ', balance / Web3.LAMPORTS_PER_SOL, 'SOL');

        if(balance / Web3.LAMPORTS_PER_SOL < 1){
            console.log('Airdropping 1 SOL');
            const airdropSignature = await connection.requestAirdrop(
                signer.publicKey, 
                Web3.LAMPORTS_PER_SOL
            );

            const latestBlockhash = await connection.getLatestBlockhash();

            await connection.confirmTransaction({
                blockhash : latestBlockhash.blockhash,
                lastValidBlockHeight : latestBlockhash.lastValidBlockHeight, 
                signature : airdropSignature,
            });

            const newBalance = await connection.getBalance(signer.publicKey);
            console.log('New balance is', newBalance / Web3.LAMPORTS_PER_SOL , "SOL");
        }
    }

async function pingProgram(
    connection : Web3.Connection,
    payer : Web3.Keypair
){
    const transaction = new Web3.Transaction();
    const instruction = new Web3.TransactionInstruction({
        // Step 1 : get the keys
        keys : [
            {
                pubkey: PROGRAM_DATA_PUBLIC_KEY,
                isSigner : false, // Since this transaction doesn't require a sign from the data account
                isWritable : true // Since this account is being written to!
            }
        ], 

        // Step 2 : Get the program ID
        programId : PROGRAM_ID,

        // Step 3 : Additional Data; which is none in this case

    });

    transaction.add(instruction);
    const transactionSignature = await Web3.sendAndConfirmTransaction(connection, transaction, [payer]);

    console.log(
        `Transaction https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
    );

}

async function sendProgram(
    connection : Web3.Connection,
    signer : Web3.Keypair
):Promise<void>{
    const toPubkey =  Web3.Keypair.generate();
    const transaction = new Web3.Transaction().add(
        Web3.SystemProgram.transfer(
            {
                fromPubkey : signer.publicKey,
                toPubkey : toPubkey.publicKey, 
                lamports : Web3.LAMPORTS_PER_SOL / 100
            }
        )
    );

    var signature = await Web3.sendAndConfirmTransaction(
        connection, 
        transaction,
        [signer] 
    );
    
    console.log(
        `Transaction https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );
}



main()
    .then(() => {
        console.log("Finished successfully")
        process.exit(0)
    })
    .catch((error) => {
        console.log(error)
        process.exit(1)
    })
