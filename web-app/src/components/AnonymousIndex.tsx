import { Card, Container, Text, CardHeader } from "@chakra-ui/react";
import useSemaphore from "../hooks/useSemaphore";
import { useEffect } from "react";

export default function AnonymousIndex() {
  const { _users, refreshUsers } = useSemaphore();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshUsers();
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  console.log(_users);

  return (
    <Container display="flex" justifyContent="center">
      <Card
        w="md"
        display="flex"
        p="2"
        mt="1"
        size="md"
        alignContent="center"
        alignItems="center"
        boxShadow="lg"
      >
        <Text>Anonymous Index: {_users.length}</Text>
      </Card>
    </Container>
  );
}
