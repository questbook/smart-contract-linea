import { task } from "hardhat/config";
import fs from "fs";

const OUTPUT_DIR = "./resources/verax/";
const SCHEMA_FILE = "schema.json";

task(
  "add-schemas",
  "Process schema.json and add to SchemaRegistry if needed"
).setAction(async ({}, { ethers, network }) => {
  const content = JSON.parse(
    fs.readFileSync("./resources/contract-network-config.json", "utf-8")
  );
  const networkDetails = content["networks"][network.name];
  const SchemaRegistryFactory = await ethers.getContractFactory(
    "SchemaRegistry"
  );
  const SchemaRegistry = await SchemaRegistryFactory.attach(
    networkDetails["SchemaRegistry"]["address"]
  );

  const schemas = JSON.parse(
    fs.readFileSync(OUTPUT_DIR + SCHEMA_FILE, "utf-8")
  );

  for (let schema of schemas) {
    console.log("process schema for " + schema.name);
    if (schema.isRegistered) continue;
    schema.id = await SchemaRegistry.getIdFromSchemaString(schema.schema);
    const checkRemoteRegistration = await SchemaRegistry.isRegistered(
      schema.id
    );

    if (checkRemoteRegistration) {
      schema.isRegistered = true;
      continue;
    }

    console.log("create schema for " + schema.name);
    const tx = await SchemaRegistry.createSchema(
      schema.name,
      "N/A",
      "N/A",
      schema.schema
    );

    await tx.wait(1);

    schema.isRegistered = await SchemaRegistry.isRegistered(schema.id);

    if (schema.isRegistered) {
      console.log("schema for " + schema.name + " registered");
    }
    console.log("schema for " + schema.name + " is not registered");
  }
  fs.writeFileSync(OUTPUT_DIR + SCHEMA_FILE, JSON.stringify(schemas));
});
