import { starknet } from 'hardhat'
import { assert, expect } from 'chai'
import { Contract, ContractFactory, Transaction } from 'ethers'
import { StarknetContract, StarknetContractFactory, ArgentAccount } from "hardhat/types/runtime";



const NAME = starknet.shortStringToBigInt("LINK")
const SYMBOL = starknet.shortStringToBigInt("LINKTOKEN")
const DECIMALS = 18

describe('ContractTests', function () {
    this.timeout(300_000);
    let accountMinter: ArgentAccount;
    let accountUser1: ArgentAccount;
    let accountUser2: ArgentAccount;
    let ERC20Contract: StarknetContract;
    // let response: InvokeResponse;
    before(async () => {
        accountMinter = (await starknet.deployAccount("Argent")) as ArgentAccount;
        console.log("accountMinter: ", accountMinter.starknetContract.address)
        accountUser1 = (await starknet.deployAccount("Argent")) as ArgentAccount;
        console.log("accountUser1: ", accountUser1.starknetContract.address)

        accountUser2 = (await starknet.deployAccount("Argent")) as ArgentAccount;
        console.log("accountUser2: ", accountUser2.starknetContract.address)

        let ERC20Factory = await starknet.getContractFactory('test/contracts/ERC20.cairo')
        ERC20Contract = await ERC20Factory.deploy({name: NAME, symbol: SYMBOL, decimals: DECIMALS, minter_address: accountMinter.starknetContract.address })
        console.log("ERC20Contract: ", ERC20Contract.address)

    });

    xit('Test Permissioned Mint', async () => {
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser1.starknetContract.address, amount: { low: 0, high: 10n } })
        await new Promise((resolve) => setTimeout(resolve,30000))
        {
            const { balance: balance1 } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
            let sum_balance = balance1.high + balance1.low
            console.log("balance=", balance1)
            expect(sum_balance).to.deep.equal(10n);
        }
        {
            const { totalSupply: totalSupply1 } = await ERC20Contract.call('totalSupply', {})
            console.log(totalSupply1)
            let sum_balance = totalSupply1.high + totalSupply1.low
            expect(sum_balance).to.deep.equal(10n);

        }
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser2.starknetContract.address, amount: { low: 5n, high: 0n } })
        {
            const { totalSupply: totalSupply1 } = await ERC20Contract.call('totalSupply', {})
            console.log(totalSupply1)
            let sum_balance = totalSupply1.high + totalSupply1.low
            expect(sum_balance).to.deep.equal(15n);
            // expect(totalSupply).to.deep.equal(15n);


            const { balance: balance1 } = await ERC20Contract.call('balanceOf', { account: accountUser2.starknetContract.address })
            let sum_balance2 =  balance1.high + balance1.low
            console.log("balance=", balance1)
            expect(sum_balance2).to.deep.equal(5n);

        }

    });
    xit('Test transfer', async () => {
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser1.starknetContract.address, amount: { low: 10n, high: 0n } })
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser2.starknetContract.address, amount: { low: 5n, high: 0n } })
        const { totalSupply: totalSupply1 } = await ERC20Contract.call('totalSupply', {})
        console.log(totalSupply1)
        let sum_balance = totalSupply1.high + totalSupply1.low
        expect(sum_balance).to.deep.equal(15n);

        const { balance: balance3 } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
        let sum_balance1 = balance3.high + balance3.low
        console.log("balance=", sum_balance1)
        {
            await accountUser1.invoke(ERC20Contract, 'transfer', {recipient: accountUser2.starknetContract.address, amount: { low: 3n, high: 0n } })

            const { balance: balance3 } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
            let sum_balance1 = balance3.high + balance3.low
            console.log("balance=", sum_balance1)
            expect(sum_balance1).to.deep.equal(7n);


            const { balance: balance2 } = await ERC20Contract.call('balanceOf', { account: accountUser2.starknetContract.address })
            let sum_balance2 = balance2.high + balance2.low
            console.log("balance=", sum_balance2)
            expect(sum_balance2).to.deep.equal(8n);

        }
        {
            await accountUser2.invoke(ERC20Contract, 'transfer', {recipient: accountUser1.starknetContract.address, amount: { low: 4n, high: 0n } })

            const { balance: balance } = await ERC20Contract.call('balanceOf', { account: accountUser2.starknetContract.address })
            let sum_balance1 = balance.high + balance.low
            console.log("balance=", sum_balance1)
            expect(sum_balance1).to.deep.equal(4n);


            const { balance: balance2 } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
            let sum_balance2 = balance2.high + balance2.low
            console.log("balance=", sum_balance2)
            expect(sum_balance2).to.deep.equal(11n);

        }
        {
            try {
                await accountUser2.invoke(ERC20Contract, 'transfer', {recipient: accountUser1.starknetContract.address, amount: { low: 12n, high: 0n } })
            } catch (error) {
                console.log("ERROR INSUFFICIENT BALANCE")
            }
            try {
                await accountUser1.invoke(ERC20Contract, 'transfer', {recipient: accountUser2.starknetContract.address, amount: { low: 12n, high: 0n } })
            } catch (error) {
                console.log("ERROR INSUFFICIENT BALANCE")
            }
            
        }

    });
    it('Test transferFrom', async () => {
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser1.starknetContract.address, amount: { low: 10n, high: 0n } })
        await accountMinter.invoke(ERC20Contract, 'permissionedMint', {recipient: accountUser2.starknetContract.address, amount: { low: 5n, high: 0n } })

        await accountMinter.invoke(ERC20Contract, 'increaseAllowance', {spender: accountUser2.starknetContract.address, added_value: { low: 2n, high: 0n } })
        await accountMinter.invoke(ERC20Contract, 'increaseAllowance', {spender: accountUser1.starknetContract.address, added_value: { low: 2n, high: 0n } })
        {
            await accountMinter.invoke(ERC20Contract, 'transferFrom', {sender: accountUser1.starknetContract.address, recipient: accountUser2.starknetContract.address, amount: { low: 3n, high: 0n } })

            const { balance: balance } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
            let sum_balance1 = balance.high + balance.low
            console.log("balance=", sum_balance1)
            expect(sum_balance1).to.deep.equal(7n);


            const { balance: balance2 } = await ERC20Contract.call('balanceOf', { account: accountUser2.starknetContract.address })
            let sum_balance2 = balance2.high + balance2.low
            console.log("balance=", sum_balance2)
            expect(sum_balance2).to.deep.equal(8n);

        }
        {
            await accountMinter.invoke(ERC20Contract, 'transferFrom', {sender: accountUser2.starknetContract.address, recipient: accountUser1.starknetContract.address, amount: { low: 4n, high: 0n } })

            const { balance: balance } = await ERC20Contract.call('balanceOf', { account: accountUser2.starknetContract.address })
            let sum_balance1 = balance.high + balance.low
            console.log("balance=", sum_balance1)
            expect(sum_balance1).to.deep.equal(4n);


            const { balance: balance2 } = await ERC20Contract.call('balanceOf', { account: accountUser1.starknetContract.address })
            let sum_balance2 = balance2.high + balance2.low
            console.log("balance=", sum_balance2)
            expect(sum_balance2).to.deep.equal(11n);

        }
        {
            try {
                await accountMinter.invoke(ERC20Contract, 'transferFrom', {sender: accountUser2.starknetContract.address, recipient: accountUser1.starknetContract.address, amount: { low: 2n, high: 10n } })
            } catch (error) {
                console.log("ERROR INSUFFICIENT BALANCE")
            }
            try {
                await accountMinter.invoke(ERC20Contract, 'transferFrom', {sender: accountUser1.starknetContract.address, recipient: accountUser2.starknetContract.address, amount: { low: 1n, high: 0n } })
            } catch (error) {
                console.log("ERROR INSUFFICIENT BALANCE")
            }
            
        }

    });
});
