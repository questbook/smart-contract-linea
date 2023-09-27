import fs from "fs";

const PROVIDERS_DIR = "../tls-receipt-verifier-main/node/example/";
const OUTPUT_DIR = "./resources/verax/";
const SCHEMA_FILE = "schema.json";

type Provider = {
  name: string;
  params: Object;
};

function getProvidersExamplesObjects(directory: string): Provider[] {
  const files = fs.readdirSync(directory);
  const providersList: Provider[] = [];

  for (let file of files) {
    const fileContent = fs.readFileSync(directory + file, "utf-8");
    const provider = JSON.parse(fileContent) satisfies Provider;
    providersList.push(provider);
  }

  return providersList;
}

function buildProperty(name: string, type: string, value?: any) {
  if (type === "number") type = "int256";

  if (value instanceof Array) {
    if (typeof value[0] === "object")
      return `${name}[] { ${encodeProviderParamsForVerax(value[0])} }`;

    return `${typeof value[0]}[] ${name}`;
  }

  if (type === "object") {
    if (Object.values(value).length == 0) {
      return `mapping(string => string) ${name}`;
    }
    return `${name} { ${encodeProviderParamsForVerax(value)} }`;
  }

  return `${type} ${name}`;
}

function encodeProviderParamsForVerax(params: Object) {
  let schemaStr = "";
  let checkFirst = false;
  for (let [k, v] of Object.entries(params)) {
    if (!checkFirst) {
      checkFirst = true;
      schemaStr = buildProperty(k, typeof v, v);
      continue;
    }
    schemaStr = schemaStr + ", " + buildProperty(k, typeof v, v);
  }
  return schemaStr;
}

async function main() {
  console.log("start scanning providers folders");
  const providers = getProvidersExamplesObjects(PROVIDERS_DIR);
  const result: { name: string; schema: string; isRegistered: boolean }[] = [];
  for (let provider of providers) {
    const schemaName = provider.name;
    const schemaStr = encodeProviderParamsForVerax(provider.params);
    result.push({
      name: schemaName,
      schema: schemaStr,
      isRegistered: false,
    });
  }

  fs.writeFileSync(OUTPUT_DIR + SCHEMA_FILE, JSON.stringify(result));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
