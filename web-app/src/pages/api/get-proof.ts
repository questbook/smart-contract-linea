import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const dbUsername = process.env.DB_USER;
const dbPassword = process.env.DB_PWD;
const callbackBase = process.env.CALLBACK_BASE;

// Connect to MongoDB Atlas. Use other DB if needed.
const mongoUri = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.oe3bojs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(mongoUri, { monitorCommands: true });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    try {
      const { id: callbackId } = req.query;
      const db = client.db();
      const callbackCollection = db.collection("reclaim");
      const entry = await callbackCollection.findOne({
        callbackId: callbackId,
      });
      if (!entry) {
        console.log(callbackId, " not found in the database");
        throw new Error(`${callbackId} not found in the database.`);
      }
      console.log(entry.proofs);
      if (entry.proofs == undefined || entry.proofs?.length == 0) {
        console.log(callbackId, " proof not received");
        throw new Error(
          `Proof from ${callbackId} not received from Reclaim Wallet.`
        );
      }
      console.log(entry.proofs);
      res.status(200).json(entry.proofs);
    } catch (error) {
      console.error("[Get-Proofs -- TEMP] -- Error: ", error);
      res.status(500).json({ msg: "DB not Connected/web3 error" });
    }
    return;
  } catch (error: any) {
    console.error(error);

    res.status(500).end();
  }
}
