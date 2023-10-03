import type { NextApiRequest, NextApiResponse } from 'next'
import { reclaimprotocol } from '@reclaimprotocol/reclaim-sdk'
import { MongoClient } from 'mongodb'

const dbUsername = process.env.DB_USER
const dbPassword = process.env.DB_PWD
const callbackBase = process.env.CALLBACK_BASE

// Connect to MongoDB Atlas. Use other DB if needed.
const mongoUri = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.oe3bojs.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(mongoUri, { monitorCommands: true })

const reclaim = new reclaimprotocol.Reclaim()

export default async function handler (
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { callbackId: callbackId } = req.query
    const body = Object.keys(req.body)
    console.log(body)
    const { proofs } = JSON.parse(decodeURIComponent(body[0]))

    console.log('[Callback -- TEMP] -- Proofs: ', proofs)
    const isProofCorrect = await reclaim.verifyCorrectnessOfProofs(
      callbackId as string,
      proofs
    )
    console.log('[Callback -- TEMP] -- is Proof Correct? ', isProofCorrect)

    res.send({
      msg: 'Callback received at backend. The backend will verify the proof now.            You can now close this window and go back to the Demo dApp.'
    })

    const db = client.db()
    const callbackCollection = db.collection('reclaim')

    const entry = await callbackCollection.findOne({ callbackId: callbackId })
    if (!entry) {
      console.log(callbackId, ' not found in the database')
      throw new Error(`${callbackId} not found in the database.`)
      // return false;
    }

    const result = await callbackCollection.updateOne(
      { callbackId: callbackId },
      { $set: { callbackId: callbackId, proofs: proofs } }
    )
    if (result.matchedCount === 0) {
      console.log(callbackId, ' not found in the database')
      throw new Error(`${callbackId} not found in the database.`)
    }
    console.log(result)
  } catch (error: any) {
    console.error(error)

    res.status(500).end()
  }
}
