import { randomBytes } from 'crypto'
import { BigNumber, Signer } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import type {} from '../hardhat.config'
import { Reclaim } from '../src/types'
import type {} from '../src/types/hardhat'

export function randomEthAddress() {
	const addr = randomBytes(20) // random address
	const addrHex = `0x${addr.toString('hex')}`
	return addrHex
}

export async function randomWallet(balanceEth: BigNumber | number = 1) {
	const wallet = ethers.Wallet.createRandom().connect(ethers.provider)
	if(balanceEth > 0) {
		// fund the wallet so it can make transactions
		let wei = typeof balanceEth === 'number'
			? '0x' + Number(balanceEth * 1e18).toString(16)
			: balanceEth.toHexString()
		wei = wei.replace('0x0', '0x')
		await ethers.provider.send('hardhat_setBalance', [wallet.address, wei])
	}

	return wallet
}

export async function deployReclaimContract(signer?: Signer) {
	const factory = await ethers.getContractFactory('Reclaim')
	let reclaim = (await upgrades.deployProxy(factory, { kind: 'uups' })) as Reclaim
	if(signer) {
	  reclaim = reclaim.connect(signer)
	}

	return reclaim
}