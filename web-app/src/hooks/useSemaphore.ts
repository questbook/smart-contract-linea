import { SemaphoreEthers } from "@semaphore-protocol/data";
import getNextConfig from "next/config";
import { useCallback, useState } from "react";
import { SemaphoreContextType } from "../context/SemaphoreContext";

const { publicRuntimeConfig: env } = getNextConfig();

const ethereumNetwork =
  env.DEFAULT_NETWORK === "localhost"
    ? "http://localhost:8545"
    : `https://opt-goerli.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_ID}`;

export default function useSemaphore(): SemaphoreContextType {
  const [_users, setUsers] = useState<any[]>([]);

  const refreshUsers = useCallback(async (): Promise<void> => {
    const semaphore = new SemaphoreEthers(ethereumNetwork, {
      address: env.SEMAPHORE_CONTRACT_ADDRESS,
    });
    console.log(env.SEMAPHORE_CONTRACT_ADDRESS);
    let members: any[] = [];
    console.log(env.GROUP_ID);
    try {
      members = await semaphore.getGroupMembers(env.GROUP_ID);
    } catch (error: any) {
      console.log(error);
    }
    setUsers(members);
  }, []);

  return {
    _users,
    refreshUsers,
  };
}
