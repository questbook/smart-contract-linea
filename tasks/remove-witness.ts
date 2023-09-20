import { task, types } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import type {} from '../src/types'
import { getContractAddress } from './utils'

task('remove-witness', 'Remove a witness')
	.addParam(
		'address',
		'The address of the witness',
		undefined,
		types.string
	)
	.setAction(async(taskArgs, { ethers, network }) => {
		const signerAddress = await ethers.provider.getSigner().getAddress()
		console.log(`removing witness on "${network.name}" from address "${signerAddress}"`)

		const contractAddress = getContractAddress(network.name)

		const factory = await ethers.getContractFactory('Reclaim')

		const contract = await factory.attach(contractAddress)
		const tx = await contract.removeAsWitness(taskArgs.address)
		await tx.wait()

		console.log(`removed witness (${taskArgs.address}) from ${contract.address}`)
	})