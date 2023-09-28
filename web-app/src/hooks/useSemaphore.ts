import { SemaphoreEthers } from "@semaphore-protocol/data";
import { BigNumber, utils } from "ethers";
import getNextConfig from "next/config";
import { useCallback, useState } from "react";
import { SemaphoreContextType } from "../context/SemaphoreContext";

const { publicRuntimeConfig: env } = getNextConfig();

const ethereumNetwork =
  env.DEFAULT_NETWORK === "localhost"
    ? "http://localhost:8545"
    : `https://linea-goerli.infura.io/v3/${env.INFURA_API_KEY}`;

export default function useSemaphore(): SemaphoreContextType {
  const [_users, setUsers] = useState<any[]>([]);
  const [_feedback, setFeedback] = useState<string[]>([]);

  const refreshUsers = useCallback(async (): Promise<void> => {
    const semaphore = new SemaphoreEthers(ethereumNetwork, {
      address: env.SEMAPHORE_CONTRACT_ADDRESS,
    });
    let members: any[] = [];
    try {
      members = await semaphore.getGroupMembers(env.GROUP_ID);
    } catch (error: any) {
      console.log(error);
    }
    setUsers(members);
  }, []);

  const addUser = useCallback(
    (user: any) => {
      setUsers([..._users, user]);
    },
    [_users]
  );

  const refreshFeedback = useCallback(async (): Promise<void> => {
    const semaphore = new SemaphoreEthers(ethereumNetwork, {
      address: env.SEMAPHORE_CONTRACT_ADDRESS,
    });

    const proofs = await semaphore.getGroupVerifiedProofs(env.GROUP_ID);

    setFeedback(
      proofs.map(({ signal }: any) =>
        utils.parseBytes32String(BigNumber.from(signal).toHexString())
      )
    );
  }, []);

  const addFeedback = useCallback(
    (feedback: string) => {
      setFeedback([..._feedback, feedback]);
    },
    [_feedback]
  );

  return {
    _users,
    _feedback,
    refreshUsers,
    addUser,
    refreshFeedback,
    addFeedback,
  };
}
