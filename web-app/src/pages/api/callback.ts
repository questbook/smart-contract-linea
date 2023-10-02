import type { NextApiRequest, NextApiResponse } from "next";
import { reclaimprotocol } from "@reclaimprotocol/reclaim-sdk";
import { MongoClient } from "mongodb";
import { hashClaimInfo } from "@reclaimprotocol/crypto-sdk";

const dbUsername = process.env.DB_USER;
const dbPassword = process.env.DB_PWD;
const callbackBase = process.env.CALLBACK_BASE;

// Connect to MongoDB Atlas. Use other DB if needed.
const mongoUri = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.oe3bojs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(mongoUri, { monitorCommands: true });

const reclaim = new reclaimprotocol.Reclaim();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const callId = "edc2a0e1-3841-49f6-abf1-12d32bb70927";
  const proof: any = [
    {
      templateClaimId: "e19f723f-7e13-411e-be54-bc281d0db7fa",
      provider: "lichess-username",
      parameters: '{"username":"HaidarJbeily"}',
      ownerPublicKey:
        "02aa7afddac9286fe776e62513927c18fefeede333377c06c74ffe52569ab7eb2e",
      timestampS: "1696259043",
      witnessAddresses: ["https://reclaim-node.questbook.app"],
      signatures: [
        "0x0816e3c3189d46c322ad0778b16fc00350467fbd1a5b2bab6aa4ae6627f7be7760ce8fdb20ee83889548f691594b9d7e0f32941d68e10c093c50a5d09b8067111b",
      ],
      redactedParameters: '{"username":"************"}',
      context:
        '\"{\\\"contextAddress\\\":\\\"0x0\\\",\\\"contextMessage\\\":\\\"0x9c1aa92781dcf4661f8abff2ea9404df23c86a42f6649fca4c2390d95bf77b2d\\\",\\\"sessionId\\\":\\\"edc2a0e1-3841-49f6-abf1-12d32bb70927\\\"}\"',
      epoch: 2,
      identifier:
        "0x956c4c8e537351f2c8ad5926a27da32a9822c2817463f5eff65e90df05b08dbc",
    },
  ];

  reclaim.verifyCorrectnessOfProofs(callId, proof);
  res.status(500).end();
  return;
  try {
    const { callbackId: callbackId } = req.query;
    const body = Object.keys(req.body);
    console.log(body);
    const { proofs } = JSON.parse(decodeURIComponent(body[0]));

    // const claimInfo = {
    //   provider: proofs[0].provider,
    //   context: proofs[0].context,
    //   parameters: proofs[0].parameters,
    // };

    proofs[0].context = (proofs[0].context as string).replaceAll('"', '\\\\"');

    proofs[0].context = (proofs[0].context as string).replaceAll("\\", '"');

    console.log("[Callback -- TEMP] -- Proofs: ", proofs);
    const isProofCorrect = await reclaim.verifyCorrectnessOfProofs(
      callbackId as string,
      proofs
    );
    console.log("[Callback -- TEMP] -- is Proof Correct? ", isProofCorrect);

    res.send({
      msg: "Callback received at backend. The backend will verify the proof now.            You can now close this window and go back to the G-coin dApp.",
    });

    const db = client.db();
    const callbackCollection = db.collection("reclaim");

    const entry = await callbackCollection.findOne({ callbackId: callbackId });
    if (!entry) {
      console.log(callbackId, " not found in the database");
      throw new Error(`${callbackId} not found in the database.`);
      // return false;
    }

    const result = await callbackCollection.updateOne(
      { callbackId: callbackId },
      { $set: { callbackId: callbackId, proofs: proofs } }
    );
    if (result.matchedCount === 0) {
      console.log(callbackId, " not found in the database");
      throw new Error(`${callbackId} not found in the database.`);
    }
    console.log(result);
  } catch (error: any) {
    console.error(error);

    res.status(500).end();
  }
}
