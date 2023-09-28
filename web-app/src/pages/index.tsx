"use client";
import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Input,
  Link,
  ListItem,
  OrderedList,
  Text,
  VStack,
} from "@chakra-ui/react";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsAvatar,
  useEnsName,
} from "wagmi";
import { Identity } from "@semaphore-protocol/identity";
import { useRouter } from "next/router";
import {
  MouseEventHandler,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Stepper from "../components/Stepper";
import LogsContext from "../context/LogsContext";
import IconAddCircleFill from "../icons/IconAddCircleFill";
import IconRefreshLine from "../icons/IconRefreshLine";
import { access } from "fs";

export default function IdentitiesPage() {
  const router = useRouter();
  const [userName, setUsername] = useState<string>("");
  const { address, isConnected } = useAccount();

  const { setLogs } = useContext(LogsContext);
  const [_identity, setIdentity] = useState<Identity>();

  useEffect(() => {
    if (!isConnected) return;
    const identity = new Identity(address);
    setIdentity(identity);
    setLogs("Give  👆🏽");
  }, [isConnected, address]);

  const generateProof = async () => {
    setLogs("Generating proofs..");
    const context = address + "other specific data";
    const parameters = JSON.stringify({ username: userName });
    const provider = "lichess_username";
    const response = await fetch("api/prove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, context, parameters, provider }),
    });
    console.log(await response.json());
    setTimeout(() => {
      setLogs("The proofs have been stored");
    }, 2000);
  };

  return (
    <div>
      {!address && <Heading>Please Connect your wallet</Heading>}
      {address && (
        <VStack alignItems="flex-start">
          <HStack width="100%" flexWrap="wrap">
            <Text fontSize="xl" fontWeight="bold" flex="1">
              lichess username:
            </Text>
            <Input
              type="text"
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />
          </HStack>
          <HStack>
            <Text fontSize="xl" fontWeight="bold">
              Provider:
            </Text>
            <Text>lichess_username</Text>
          </HStack>
          <HStack>
            <Text fontSize="xl" fontWeight="bold">
              Context Address:
            </Text>
            <Text>{address}</Text>
          </HStack>
          <Button
            w="100%"
            fontWeight="bold"
            justifyContent="center"
            colorScheme="primary"
            px="4"
            mt="2"
            onClick={generateProof}
          >
            Generate Proof
          </Button>
        </VStack>
      )}
    </div>
  );
}
