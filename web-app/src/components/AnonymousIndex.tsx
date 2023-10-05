import { Card, Container, Text, CardHeader } from '@chakra-ui/react'
import useSemaphore from '../hooks/useSemaphore'
import { useEffect } from 'react'

const calcIndexStr = (index: number) => {
  if (index >= 10) return 'Excellent'
  if (index >= 2) return 'Good'
  return 'Low'
}

export default function AnonymousIndex () {
  const { _users, refreshUsers } = useSemaphore()

  useEffect(() => {
    refreshUsers()
    const interval = setInterval(() => {
      refreshUsers()
    }, 2000)

    return () => clearInterval(interval)
  }, [])
  console.log(_users)

  return (
    <Container display='flex' justifyContent='center'>
      <Card
        w='md'
        display='flex'
        p='2'
        mt='9'
        size='md'
        alignContent='center'
        alignItems='center'
        boxShadow='lg'
      >
        <Text>
          Anonymous Index: {_users.length} ({calcIndexStr(_users.length)})
        </Text>
      </Card>
    </Container>
  )
}
