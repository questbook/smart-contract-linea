import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { Proof } from '@reclaimprotocol/reclaim-sdk'
import { useAccount } from 'wagmi'
import UserMerkelizer from './UserMerkelizer'
import { Divider, Flex, Text } from '@chakra-ui/react'
import UserAttestator from './UserAttestator'

function App () {
  const backendBase = ''
  const backendTemplateUrl = `${backendBase}/api/prove`
  const backendProofUrl = `${backendBase}/api/get-proof`

  const { address, connector, isConnected } = useAccount()

  const [template, setTemplate] = useState('')
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)
  const [isTemplateOk, setIsTemplateOk] = useState(true)
  const [isProofReceived, setIsProofReceived] = useState(false)
  const [proofObj, setProofObj] = useState<Proof>()
  const [callbackId, setCallbackId] = useState('')

  useEffect(() => {
    if (isConnected && !isProofReceived) {
      console.log('Starting to fetch template.')
      handleGetTemplate()
      const intervalId = setInterval(fetchProof, 4000)
      return () => {
        console.log('Template received/Remounted.')
        clearInterval(intervalId)
      }
    }
  })

  const fetchProof = async () => {
    if (isLoadingTemplate) {
      console.log('Template is still loading.')
      return
    }
    try {
      console.log(`Requesting ${backendProofUrl}?id=${callbackId}`)
      const response = await fetch(`${backendProofUrl}?id=${callbackId}`)
      if (response.status === 200) {
        const proofData = await response.json()
        setIsProofReceived(true)
        setProofObj(proofData[0])
      }
    } catch (error) {
      setIsProofReceived(false)
      console.log(error)
    }
  }

  const handleGetTemplate = async () => {
    if (isTemplateOk && template) {
      console.log('The template is already received.')
      return
    }
    setIsLoadingTemplate(true)
    try {
      console.log(`Requesting ${backendTemplateUrl}?userAddr=${address}`)
      const response = await fetch(`${backendTemplateUrl}?userAddr=${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data?.error) {
          console.log(data.error)
          throw new Error(data.error)
        }
        setCallbackId(data.callbackId)
        setTemplate(data.reclaimUrl)
        setIsTemplateOk(true)
        console.log('The template generated is: ', template)
      } else {
        setIsTemplateOk(false)
        setTemplate(
          'Error: Unable to receive a valid template from the backend. Check if it is up and running. Please try again later.'
        )
      }
    } catch (error) {
      setIsTemplateOk(false)
      setTemplate('Error: ' + error)
      console.log(error)
    }
    setIsLoadingTemplate(false)
    return
  }

  return (
    <>
      {isProofReceived && <UserMerkelizer proofObj={proofObj} />}
      {isProofReceived && <UserAttestator proofObj={proofObj} />}

      {
        // If template is not ok
        template && !isTemplateOk && !isProofReceived && (
          <>
            <h2>Prove that your own a google account.</h2>
            <div>{template}</div>
          </>
        )
      }

      {!isProofReceived && template && isTemplateOk && (
        <>
          <Text>
            Connected to {connector?.name} at {address}
          </Text>
          <Divider />
          <Text>
            Scan/Click the QR code to be redirected to Reclaim Wallet.
          </Text>
          <Divider />
        </>
      )}

      {
        // Show the QR code only when it has to be shown
        template && isTemplateOk && !isProofReceived && (
          <Flex justifyContent={'center'}>
            <a
              href={template}
              target='_blank'
              rel='noopener noreferrer'
              title={template}
            >
              <QRCode
                size={256}
                value={template}
                fgColor='#000'
                bgColor='#fff'
                className='QR-resize'
              />
            </a>
          </Flex>
        )
      }
    </>
  )
}

export default App
