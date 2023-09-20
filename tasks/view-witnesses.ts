import { task } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import { getContractAddress } from './utils'

task('view-witnesses', 'View the witnesses registered with the contract')
	.setAction(async({}, { ethers, network }) => {
		console.log(`viewing witnesses on "${network.name}"`)

		const factory = await ethers.getContractFactory('Reclaim')
		const contractAddress = getContractAddress(network.name)
		const contract = factory.attach(contractAddress)

		let i = 0
		for(;;i++) {
			try {
				const { host, addr } = await contract.witnesses(i)
				console.log(`witness ${i}: ${addr} (${host})`)
			} catch(error) {
				break
			}
 		}

		console.log(`found ${i} witnesses`)
	})
