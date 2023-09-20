import { task, types } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import type {} from '../src/types'
import { getContractAddress } from './utils'

task('whitelist-oracle', 'Whitelist an Oracle')
	.addParam(
		'address',
		'The address of the oracle',
		undefined,
		types.string
	)
	.setAction(async(taskArgs, { ethers, network }) => {
		const signerAddress = await ethers.provider.getSigner().getAddress()
		console.log(`whitelisting oracle on "${network.name}" from address "${signerAddress}"`)

		const contractAddress = getContractAddress(network.name)

		const factory = await ethers.getContractFactory('Reclaim')

		const contract = await factory.attach(contractAddress)
		const tx = await contract.updateOracleWhitelist(
			taskArgs.address,
			true
		)
		await tx.wait()

		console.log(`whitelisted oracle (${taskArgs.address}) on ${contract.address}`)
	})