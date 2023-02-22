
// Import event types from the registry contract ABI
import {
  FusesSetEvent, NameUnwrappedEvent, NameWrappedEvent, TransferBatchEvent, TransferSingleEvent
} from '../types/ethers-contracts/NameWrapper'
// Import entity types generated from the GraphQL schema
import { Domain, FusesSet, NameUnwrapped, NameWrapped, WrappedDomain, WrappedTransfer } from '../types/models'
import { concat, createEventID, createOrLoadAccount, createOrLoadDomain } from './utils'
import {EthereumLog} from "@subql/types-ethereum";

function decodeName (buf:Buffer):Array<string> {
  let offset = 0
  let list = new Buffer(0);
  let dot = Buffer.from('2e')
  let len = buf[offset++]
  let hex = '0x' +buf.toString()
  let firstLabel = ''
  if (len === 0) {
    return [firstLabel, '.']
  }

  while (len) {
    let label = hex.slice((offset +1 ) * 2, (offset + 1 + len ) * 2)
    let labelBytes = Bytes.fromHexString(label)

    if(offset > 1){
      list = concat(list, dot)
    }else{
      firstLabel = labelBytes.toString()
    }
    list = concat(list, labelBytes)
    offset += len
    len = buf[offset++]
  }
  return [firstLabel, list.toString()]
}



export async function handleNameWrapped(event: EthereumLog<NameWrappedEvent["args"]>): void {
  logger
  let decoded = decodeName(event.args.name)
  let label = decoded[0]
  let name = decoded[1]
  let node = event.args.node
  let fuses = event.args.fuses
  let blockNumber = event.block.number
  let transactionID = event.transactionHash
  let owner = createOrLoadAccount(event.args.owner.toHex())
  let domain = await createOrLoadDomain(node)

  if (!domain.labelName) {
    domain.labelName = label
    domain.name = name
  }
  domain.save()

  let wrappedDomain = new WrappedDomain(node.toHex())
  wrappedDomain.domain = domain.id
  wrappedDomain.expiryDate = event.args.expiry
  wrappedDomain.fuses = fuses
  wrappedDomain.owner = owner.id
  wrappedDomain.labelName = name
  wrappedDomain.save()

  let nameWrappedEvent = new NameWrapped(createEventID(event))
  nameWrappedEvent.domain = domain.id
  nameWrappedEvent.name = name
  nameWrappedEvent.fuses = fuses
  nameWrappedEvent.owner = owner.id
  nameWrappedEvent.blockNumber = blockNumber
  nameWrappedEvent.transactionID = transactionID
  nameWrappedEvent.save()
}

export function handleNameUnwrapped(event: NameUnwrappedEvent): void {
  let node = event.args.node
  let blockNumber = event.block.number.toI32()
  let transactionID = event.transaction.hash
  let owner = createOrLoadAccount(event.args.owner.toHex())

  let nameUnwrappedEvent = new NameUnwrapped(createEventID(event))
  nameUnwrappedEvent.domain = node.toHex()
  nameUnwrappedEvent.owner = owner.id
  nameUnwrappedEvent.blockNumber = blockNumber
  nameUnwrappedEvent.transactionID = transactionID
  nameUnwrappedEvent.save()

  store.remove('WrappedDomain', node.toHex())
}

export function handleFusesSet(event: FusesSetEvent): void {
  let node = event.args.node
  let fuses = event.args.fuses
  let expiry = event.args.expiry
  let blockNumber = event.block.number.toI32()
  let transactionID = event.transaction.hash
  let wrappedDomain = WrappedDomain.load(node.toHex())!
  wrappedDomain.fuses = fuses
  wrappedDomain.expiryDate = expiry
  wrappedDomain.save()
  let fusesBurnedEvent = new FusesSet(createEventID(event))
  fusesBurnedEvent.domain = node.toHex()
  fusesBurnedEvent.fuses = fuses
  fusesBurnedEvent.blockNumber = blockNumber
  fusesBurnedEvent.transactionID = transactionID
  fusesBurnedEvent.save()
}

function makeWrappedTransfer(blockNumber: i32, transactionID: Bytes, eventID: string, node: BigInt, to: string): void {
  const _to = createOrLoadAccount(to)
  const namehash = '0x' + node.toHex().slice(2).padStart(64, '0')
  const domain = createOrLoadDomain(namehash)
  let wrappedDomain = WrappedDomain.load(namehash)
  // new registrations emit the Transfer` event before the NameWrapped event
  // so we need to create the WrappedDomain entity here
  if (wrappedDomain == null) {
    wrappedDomain = new WrappedDomain(namehash)
  }
  wrappedDomain.owner = _to.id
  wrappedDomain.save()
  const wrappedTransfer = new WrappedTransfer(eventID)
  wrappedTransfer.domain = domain.id
  wrappedTransfer.blockNumber = blockNumber
  wrappedTransfer.transactionID = transactionID
  wrappedTransfer.owner = _to.id
  wrappedTransfer.save()
}

export function handleTransferSingle(event: TransferSingleEvent): void {
  makeWrappedTransfer(event.block.number.toI32(), event.transaction.hash, createEventID(event).concat('-0'), event.args.id, event.args.to.toHex())
}

export function handleTransferBatch(event: TransferBatchEvent): void {
  let blockNumber = event.block.number.toI32()
  let transactionID = event.transaction.hash
  let ids = event.args.ids
  let to = event.args.to
  for (let i = 0; i < ids.length; i++) {
    makeWrappedTransfer(blockNumber, transactionID, createEventID(event).concat('-').concat(i.toString()), ids[i], to.toHex())
  }
}
