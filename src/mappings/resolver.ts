
import {
  ABIChangedEvent,
  AddrChangedEvent,
  AddressChangedEvent,
  AuthorisationChangedEvent,
  ContenthashChangedEvent,
  InterfaceChangedEvent,
  NameChangedEvent,
  PubkeyChangedEvent,
  VersionChangedEvent,
  TextChanged_bytes32_string_string_Event as TextChangedEvent, TextChanged_bytes32_string_string_string_Event as TextChangedWithValueEvent
} from "../types/ethers-contracts/PublicResolver";

import {
  AbiChanged,
  Account,
  AddrChanged,
  AuthorisationChanged,
  ContenthashChanged,
  Domain,
  InterfaceChanged,
  MulticoinAddrChanged,
  NameChanged,
  PubkeyChanged,
  Resolver,
  TextChanged,
  VersionChanged,
} from "../types/models";
import {EthereumLog} from "@subql/types-ethereum";

export async function handleAddrChanged(event: EthereumLog<AddrChangedEvent["args"]>): Promise<void> {
  let account = new Account(event.args.a)
  await account.save()

  let resolver = new Resolver(createResolverID(event.args.node, event.address))
  resolver.domainId = event.args.node
  resolver.address = event.address
  resolver.addrId = event.args.a
  await resolver.save()

  let domain = await Domain.get(event.args.node)
  if (domain && domain.resolverId == resolver.id) {
    domain.resolvedAddressId = event.args.a
    await domain.save()
  }

  let resolverEvent = new AddrChanged(createEventID(event))
  resolverEvent.resolverId = resolver.id
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.addrId = event.args.a
  await resolverEvent.save()
}

export async function handleMulticoinAddrChanged(event: EthereumLog<AddressChangedEvent["args"]>): Promise<void> {
  let resolver = await getOrCreateResolver(event.args.node, event.address)
  let coinType = event.args.coinType
  if (resolver.coinTypes == null ||resolver.coinTypes == undefined ) {
    resolver.coinTypes = [coinType.toBigInt()];
    await resolver.save();
  } else {
    let coinTypes = resolver.coinTypes!
    if (!coinTypes.includes(coinType.toBigInt())) {
      coinTypes.push(coinType.toBigInt())
      resolver.coinTypes = coinTypes
      await resolver.save()
    }
  }

  let resolverEvent = new MulticoinAddrChanged(createEventID(event))
  resolverEvent.resolverId = resolver.id
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.coinType = coinType.toBigInt()
  resolverEvent.addr = event.args.newAddress
  await resolverEvent.save()
}

export async function handleNameChanged(event: EthereumLog<NameChangedEvent["args"]>): Promise<void> {
  if (event.args.name.indexOf("\u0000") != -1) return;

  let resolverEvent = new NameChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.name = event.args.name
  await resolverEvent.save()
}

export async function handleABIChanged(event: EthereumLog<ABIChangedEvent["args"]>): Promise<void> {
  let resolverEvent = new AbiChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.contentType = event.args.contentType.toBigInt()
  await resolverEvent.save()
}

export async function handlePubkeyChanged(event: EthereumLog<PubkeyChangedEvent["args"]>): Promise<void> {
  let resolverEvent = new PubkeyChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.x = event.args.x
  resolverEvent.y = event.args.y
  await resolverEvent.save()
}

export async function handleTextChanged(event: EthereumLog<TextChangedEvent["args"]>): Promise<void> {
  let resolver = await getOrCreateResolver(event.args.node, event.address)

  let key = event.args.key;
  if(resolver.texts == null || resolver.texts == undefined) {
    resolver.texts = [key];
    await resolver.save();
  } else {
    let texts = resolver.texts!
    if(!texts.includes(key)){
      texts.push(key)
      resolver.texts = texts
      await resolver.save()
    }
  }

  let resolverEvent = new TextChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.key = event.args.key
  await resolverEvent.save()
}

export async function handleTextChangedWithValue(event: EthereumLog<TextChangedWithValueEvent["args"]>):  Promise<void> {
  let resolver = await getOrCreateResolver(event.args.node, event.address)
  let key = event.args.key;
  if (resolver.texts == null || resolver.texts == undefined) {
    resolver.texts = [key];
    await resolver.save();
  } else {
    let texts = resolver.texts!
    if (!texts.includes(key)) {
      texts.push(key)
      resolver.texts = texts
      await resolver.save()
    }
  }

  let resolverEvent = new TextChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.key = event.args.key
  resolverEvent.value = event.args.value
  await resolverEvent.save()
}

export async function handleContentHashChanged(event: EthereumLog<ContenthashChangedEvent["args"]>): Promise<void> {
  let resolver = await getOrCreateResolver(event.args.node, event.address)
  resolver.contentHash = event.args.hash
  await resolver.save()

  let resolverEvent = new ContenthashChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.hash = event.args.hash
  await resolverEvent.save()
}

export function handleInterfaceChanged(event: EthereumLog<InterfaceChangedEvent["args"]>): void {
  let resolverEvent = new InterfaceChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.interfaceID = event.args.interfaceID
  resolverEvent.implementer = event.args.implementer
  resolverEvent.save()
}

export async function handleAuthorisationChanged(event: EthereumLog<AuthorisationChangedEvent["args"]>): Promise<void> {
  let resolverEvent = new AuthorisationChanged(createEventID(event))
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.owner = event.args.owner
  resolverEvent.target = event.args.target
  resolverEvent.isAuthorized = event.args.isAuthorised
  await resolverEvent.save()
}

export async function handleVersionChanged(event: EthereumLog<VersionChangedEvent["args"]>): Promise<void> {
  let resolverEvent = new VersionChanged(createEventID(event))
  resolverEvent.blockNumber = event.block.number
  resolverEvent.transactionID = event.transactionHash
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.version = event.args.newVersion.toBigInt()
  await resolverEvent.save()

  let domain = await Domain.get(event.args.node)
  if (domain && domain.resolverId === resolverEvent.resolverId) {
    domain.resolvedAddressId = null
    await domain.save()
  }

  let resolver = await getOrCreateResolver(event.args.node, event.address)
  resolver.addrId = null
  resolver.contentHash = null
  resolver.texts = null
  resolver.coinTypes = null
  await resolver.save()
}

async function getOrCreateResolver(node: string, address: string): Promise<Resolver> {
  let id = createResolverID(node, address)
  let resolver = await Resolver.get(id)
  if (resolver === null || resolver === undefined) {
    resolver = new Resolver(id)
    resolver.domainId = node
    resolver.address = address
  }
  return resolver as Resolver
}

function createEventID(event: EthereumLog): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString())
}

function createResolverID(node: string, resolver: string): string {
  return resolver.concat('-').concat(node)
}
