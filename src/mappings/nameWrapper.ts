
// Import event types from the registry contract ABI
import {
  FusesSetEvent, NameUnwrappedEvent, NameWrappedEvent, TransferBatchEvent, TransferSingleEvent
} from '../types/ethers-contracts/NameWrapper'
// Import entity types generated from the GraphQL schema
import { Domain, FusesSet, NameUnwrapped, NameWrapped, WrappedDomain, WrappedTransfer } from '../types/models'
import { concat, createEventID, createOrLoadAccount, createOrLoadDomain } from './utils'
import {EthereumLog} from "@subql/types-ethereum";
import {BigNumber} from "ethers";

function decodeName (buf:Buffer):Array<string> {
  let offset = 0
  let list = new Buffer(0);
  let dot = Buffer.from('2e')
  let len = buf[offset++]
  let hex = '0x' + buf.toString()
  let firstLabel = ''
  if (len === 0) {
    return [firstLabel, '.']
  }

  while (len) {
    let label = hex.slice((offset +1 ) * 2, (offset + 1 + len ) * 2)
    let labelBytes = Buffer.from(label)

    if(offset > 1){
      list = Buffer.concat([list, dot])
    }else{
      firstLabel = labelBytes.toString()
    }
    list = Buffer.concat([list, labelBytes])
    offset += len
    len = buf[offset++]
  }
  return [firstLabel, list.toString()]
}



export async function handleNameWrapped(event: EthereumLog<NameWrappedEvent["args"]>): Promise<void> {
  let decoded = decodeName(Buffer.from(event.args.name))
  let label = decoded[0]
  let name = decoded[1]
  let node = event.args.node
  let fuses = event.args.fuses
  let blockNumber = event.block.number
  let transactionID = event.transactionHash
  let owner = await createOrLoadAccount(event.args.owner)
  let domain = await createOrLoadDomain(node)

  if (!domain.labelName) {
    domain.labelName = label
    domain.name = name
  }
  await domain.save()

  let wrappedDomain = new WrappedDomain(node)
  wrappedDomain.domainId = domain.id
  wrappedDomain.expiryDate = event.args.expiry.toBigInt()
  wrappedDomain.fuses = fuses
  wrappedDomain.ownerId = owner.id
  wrappedDomain.labelName = name
  await wrappedDomain.save()

  let nameWrappedEvent = new NameWrapped(createEventID(event))
  nameWrappedEvent.domainId = domain.id
  nameWrappedEvent.name = name
  nameWrappedEvent.fuses = fuses
  nameWrappedEvent.ownerId = owner.id
  nameWrappedEvent.blockNumber = blockNumber
  nameWrappedEvent.transactionID = transactionID
  await nameWrappedEvent.save()
}

export async function handleNameUnwrapped(event: EthereumLog<NameUnwrappedEvent["args"]>): Promise<void> {
  let node = event.args.node
  let blockNumber = event.block.number
  let transactionID = event.transactionHash
  let owner = await createOrLoadAccount(event.args.owner)

  let nameUnwrappedEvent = new NameUnwrapped(createEventID(event))
  nameUnwrappedEvent.domainId = node
  nameUnwrappedEvent.ownerId = owner.id
  nameUnwrappedEvent.blockNumber = blockNumber
  nameUnwrappedEvent.transactionID = transactionID
  await nameUnwrappedEvent.save()
  await WrappedDomain.remove(node)
}

export async function handleFusesSet(event: EthereumLog<FusesSetEvent["args"]>): Promise<void> {
  let node = event.args.node
  let fuses = event.args.fuses
  let expiry = event.args.expiry
  let blockNumber = event.block.number
  let transactionID = event.transactionHash
  let wrappedDomain = await WrappedDomain.get(node)
  wrappedDomain.fuses = fuses
  wrappedDomain.expiryDate = expiry.toBigInt()
  await wrappedDomain.save()
  let fusesBurnedEvent = new FusesSet(createEventID(event))
  fusesBurnedEvent.domainId = node
  fusesBurnedEvent.fuses = fuses
  fusesBurnedEvent.blockNumber = blockNumber
  fusesBurnedEvent.transactionID = transactionID
  await fusesBurnedEvent.save()
}

async function makeWrappedTransfer(blockNumber: number, transactionID: string, eventID: string, node: BigNumber, to: string): Promise<void> {
  const _to = await createOrLoadAccount(to)
  const namehash = '0x' + node.toHexString().slice(2).padStart(64, '0')
  const domain = await createOrLoadDomain(namehash)
  let wrappedDomain = await WrappedDomain.get(namehash)
  // new registrations emit the Transfer` event before the NameWrapped event
  // so we need to create the WrappedDomain entity here
  if (wrappedDomain == null) {
    wrappedDomain = new WrappedDomain(namehash)
  }
  wrappedDomain.ownerId = _to.id
  await wrappedDomain.save()
  const wrappedTransfer = new WrappedTransfer(eventID)
  wrappedTransfer.domainId = domain.id
  wrappedTransfer.blockNumber = blockNumber
  wrappedTransfer.transactionID = transactionID
  wrappedTransfer.ownerId = _to.id
  await wrappedTransfer.save()
}

export async function handleTransferSingle(event: EthereumLog<TransferSingleEvent["args"]>): Promise<void> {
  await makeWrappedTransfer(event.block.number, event.transactionHash, createEventID(event).concat('-0'), event.args.id, event.args.to)
}

export async function handleTransferBatch(event: EthereumLog<TransferBatchEvent["args"]>): Promise<void> {
  let blockNumber = event.block.number
  let transactionID = event.transactionHash
  let ids = event.args.ids
  let to = event.args.to
  //TODO, use promise.all
  for (let i = 0; i < ids.length; i++) {
    await makeWrappedTransfer(blockNumber, transactionID, createEventID(event).concat('-').concat(i.toString()), ids[i], to)
  }
}
