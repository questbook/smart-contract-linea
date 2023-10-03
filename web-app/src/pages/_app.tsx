"use client";
import {
  ChakraProvider,
  Container,
  HStack,
  Heading,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { SupportedNetwork } from "@semaphore-protocol/data";
import type { AppProps } from "next/app";
import getNextConfig from "next/config";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import LogsContext from "../context/LogsContext";
import SemaphoreContext from "../context/SemaphoreContext";
import useSemaphore from "../hooks/useSemaphore";
import theme from "../styles/index";
import { WagmiConfig, createConfig } from "wagmi";
import { lineaTestnet, optimismGoerli } from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ConnectKitButton } from "connectkit";
import AnonymousIndex from "../components/AnonymousIndex";
import dynamic from "next/dynamic";

const { publicRuntimeConfig: env } = getNextConfig();

const config = createConfig(
  getDefaultConfig({
    appName: "Reclaim",
    // infuraId: process.env.NEXT_PUBLIC_INFURA_API_ID,
    alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_ID,
    chains: [optimismGoerli],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  })
);

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const semaphore = useSemaphore();
  const [_logs, setLogs] = useState<string>("");

  return (
    <>
      <Head>
        <title>Reclaim Demo</title>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ebedff" />
      </Head>

      <ChakraProvider theme={theme}>
        <SemaphoreContext.Provider value={semaphore}>
          <WagmiConfig config={config}>
            <ConnectKitProvider>
              <HStack
                pt="2"
                alignContent="flex-end"
                justifyContent="space-around"
                suppressHydrationWarning={true}
              >
                <Heading fontSize="xl">Lichess Provider</Heading>
                <ConnectKitButton />
              </HStack>
              <AnonymousIndex />
              <Container
                maxW="2xl"
                flex="1"
                display="flex"
                alignItems="center"
                suppressHydrationWarning={true}
              >
                <Stack py="1" display="flex" width="100% ">
                  <LogsContext.Provider
                    value={{
                      _logs,
                      setLogs,
                    }}
                  >
                    <Component {...pageProps} />
                  </LogsContext.Provider>
                </Stack>
              </Container>
            </ConnectKitProvider>
          </WagmiConfig>
        </SemaphoreContext.Provider>

        <HStack
          flexBasis="56px"
          borderTop="1px solid #8f9097"
          backgroundColor="#DAE0FF"
          align="center"
          justify="center"
          spacing="4"
          p="4"
        >
          {_logs.endsWith("...") && <Spinner color="primary.400" />}
          <Text fontWeight="bold">
            {_logs || `Current step: ${router.route}`}
          </Text>
        </HStack>
      </ChakraProvider>
    </>
  );
}

export default dynamic(() => Promise.resolve(App), {
  ssr: false,
});
