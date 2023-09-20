import { task } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import { getContractAddress } from './utils'

task('add-new-epoch', 'Start a new epoch')
	.setAction(async(taskArgs, { ethers, network }) => {
		const signerAddress = await ethers.provider.getSigner().getAddress()
		console.log(`adding witness on "${network.name}" from address "${signerAddress}"`)

		const contractAddress = getContractAddress(network.name)
		const factory = await ethers.getContractFactory('Reclaim')
		const contract = factory.attach(contractAddress)

		const tx = await contract.addNewEpoch()
		await tx.wait()
		const currentEpoch = await contract.fetchEpoch(0)
		console.log(`current epoch: ${currentEpoch.id}`)
		console.log(`epoch witnesses: ${currentEpoch.witnesses.map(w => w.addr).join(', ')}`)
		console.log(`epoch start: ${new Date(currentEpoch.timestampStart * 1000)}`)
	})
