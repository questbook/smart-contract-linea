import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Link,
  Text,
  useBoolean,
  VStack,
} from "@chakra-ui/react";
import { Identity } from "@semaphore-protocol/identity";
import getNextConfig from "next/config";
import { useRouter } from "next/router";
import { useCallback, useContext, useEffect, useState } from "react";
import Reclaim from "../../contract-artifacts/Reclaim.json";
import Stepper from "../components/Stepper";
import LogsContext from "../context/LogsContext";
import SemaphoreContext from "../context/SemaphoreContext";
import IconAddCircleFill from "../icons/IconAddCircleFill";
import IconRefreshLine from "../icons/IconRefreshLine";

const { publicRuntimeConfig: env } = getNextConfig();

export default function GroupsPage() {
  const router = useRouter();
  const { setLogs } = useContext(LogsContext);
  const { _users, refreshUsers, addUser } = useContext(SemaphoreContext);
  const [_loading, setLoading] = useBoolean();
  const [_identity, setIdentity] = useState<Identity>();

  useEffect(() => {
    const identityString = localStorage.getItem("identity");

    if (!identityString) {
      router.push("/");
      return;
    }

    setIdentity(new Identity(identityString));
  }, []);

  useEffect(() => {
    if (_users.length > 0) {
      setLogs(
        `${_users.length} user${
          _users.length > 1 ? "s" : ""
        } retrieved from the group 🤙🏽`
      );
    }
  }, [_users]);

  const joinGroup = useCallback(async () => {
    if (!_identity) {
      return;
    }

    setLoading.on();
    setLogs(`Joining the Feedback group...`);

    let response: any;

    // if (response.status === 200) {
    //   addUser(_identity.commitment.toString());

    //   setLogs(
    //     `You joined the Feedback group event 🎉 Share your feedback anonymously!`
    //   );
    // } else {
    //   setLogs("Some error occurred, please try again!");
    // }
    setTimeout(() => {
      setLoading.off();
    }, 5000);
  }, [_identity]);

  const userHasJoined = useCallback(
    (identity: Identity) => _users.includes(identity.commitment.toString()),
    [_users]
  );

  return (
    <>
      <Heading as="h2" size="xl">
        Groups
      </Heading>

      <Text pt="2" fontSize="md"></Text>

      <Divider pt="5" borderColor="gray.500" />

      <HStack py="5" justify="space-between">
        <Text fontWeight="bold" fontSize="lg">
          Feedback users ({_users.length})
        </Text>
        <Button
          leftIcon={<IconRefreshLine />}
          variant="link"
          color="text.700"
          onClick={refreshUsers}
        >
          Refresh
        </Button>
      </HStack>

      <Box pb="5">
        <Button
          w="100%"
          fontWeight="bold"
          justifyContent="left"
          colorScheme="primary"
          px="4"
          onClick={joinGroup}
          isDisabled={_loading || !_identity || userHasJoined(_identity)}
          leftIcon={<IconAddCircleFill />}
        >
          Join group
        </Button>
      </Box>

      {_users.length > 0 && (
        <VStack
          spacing="3"
          px="3"
          align="left"
          maxHeight="300px"
          overflowY="scroll"
        >
          {_users.map((user, i) => (
            <HStack key={i} p="3" borderWidth={1} whiteSpace="nowrap">
              <Text textOverflow="ellipsis" overflow="hidden">
                {user}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}

      <Divider pt="6" borderColor="gray" />

      <Stepper
        step={2}
        onPrevClick={() => router.push("/")}
        onNextClick={
          _identity && userHasJoined(_identity)
            ? () => router.push("/proofs")
            : undefined
        }
      />
    </>
  );
}
