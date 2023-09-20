import { task, types } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import { getContractAddress } from './utils'

task('add-witness', 'Register a witness')
	.addOptionalParam(
		'address',
		'The address of the witness. Leave blank to use signer address',
		undefined,
		types.string
	)
	.addParam('host', 'The host of the witness', undefined, types.string)
	.setAction(async(taskArgs, { ethers, network }) => {
		const signerAddress = await ethers.provider.getSigner().getAddress()
		console.log(`adding witness on "${network.name}" from address "${signerAddress}"`)

		const contractAddress = getContractAddress(network.name)
		const oracleAddress = taskArgs.address || signerAddress

		const factory = await ethers.getContractFactory('Reclaim')

		const contract = factory.attach(contractAddress)

		try {
			await addAsOracle()
		} catch(error) {
			// If the witness is not whitelisted, whitelist it and try again
			if(error.message.includes(' can add an witness')) {
				console.log('not whitelisted, whitelisting...')
				const tx = await contract.updateWitnessWhitelist(
					oracleAddress,
					true
				)
				await tx.wait()
				await addAsOracle()
			} else {
				throw error
			}
		}

		console.log(`added witness (${taskArgs.address}) on ${contract.address}`)

		async function addAsOracle() {
			const tx = await contract.addAsWitness(
				oracleAddress,
				taskArgs.host
			)
			await tx.wait()
		}
	})
