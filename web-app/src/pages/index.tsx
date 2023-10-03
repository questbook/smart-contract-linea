"use client";
import {
  Button,
  Container,
  Heading,
  HStack,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";

import { useAccount } from "wagmi";
import { Identity } from "@semaphore-protocol/identity";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import Stepper from "../components/Stepper";
import LogsContext from "../context/LogsContext";
import IconAddCircleFill from "../icons/IconAddCircleFill";
import IconRefreshLine from "../icons/IconRefreshLine";
import useSemaphore from "../hooks/useSemaphore";
// import useReclaimPortal from "../hooks/useReclaimPortal";
import ReclaimProve from "../components/ReclaimProve";

export default function IdentitiesPage() {
  const router = useRouter();
  const [isFinishedGenerating, setIsFinishedGenerating] =
    useState<boolean>(false);
  const [userName, setUsername] = useState<string>("");
  const { address, isConnected } = useAccount();
  const { _users } = useSemaphore();
  // const { attest } = useReclaimPortal();
  const { setLogs } = useContext(LogsContext);
  const [_identity, setIdentity] = useState<Identity>();
  const [proof, setProof] = useState();

  useEffect(() => {
    console.log(_users);
    if (!isConnected) return;
    const identity = new Identity(address);
    setIdentity(identity);
    setLogs("Give  Proof for your lichess username claim👆🏽");
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
    const res = await response.json();
    setProof(res);
    setTimeout(() => {
      setLogs("The proofs have been stored");
      setIsFinishedGenerating(true);
    }, 2000);
  };

  const handleAttest = async () => {
    const idCommitment = _identity?.commitment.toString();
    // const res = await attest(proof, idCommitment);
  };

  return (
    <>
      {!address && (
        <Heading textAlign="center">Please Connect your wallet</Heading>
      )}
      {address && (
        <>
          {/* <HStack width="100%" flexWrap="wrap">
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
          </HStack> */}
          {isFinishedGenerating ? (
            <Button
              w="100%"
              fontWeight="bold"
              justifyContent="center"
              colorScheme="primary"
              px="4"
              mt="2"
              onClick={handleAttest}
            >
              Attest with your proof
            </Button>
          ) : (
            <ReclaimProve />
          )}
        </>
      )}
    </>
  );
}
