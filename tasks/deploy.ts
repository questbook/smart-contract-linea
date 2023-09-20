import { task } from 'hardhat/config'

task('deploy')
	.setAction(async({}, { ethers, upgrades }) => {
		const ReclaimFactory = await ethers.getContractFactory('Reclaim')
		const Reclaim = await upgrades.deployProxy(ReclaimFactory, { kind: 'uups' })
		const tx = await Reclaim.deployed()
		const res = await tx.deployTransaction.wait()

		// @ts-expect-error events
		console.log('Reclaim Implementation deployed to:', res.events[0].args[0])
		console.log('Reclaim Proxy deployed to: ', Reclaim.address)
	})