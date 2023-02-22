
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

import { } from "../types/ethers-contracts/PublicResolver";

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

export function handleAddrChanged(event: AddrChangedEvent): void {
  let account = new Account(event.args.a)
  await account.save()

  let resolver = new Resolver(createResolverID(event.args.node, event.address))
  resolver.domain = event.args.node
  resolver.address = event.address
  resolver.addr = event.args.a
  resolver.save()

  let domain = Domain.load(event.args.node.toHexString())
  if(domain && domain.resolver == resolver.id) {
    domain.resolvedAddress = event.args.a.toHexString()
    domain.save()
  }

  let resolverEvent = new AddrChanged(createEventID(event))
  resolverEvent.resolver = resolver.id
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.addr = event.args.a.toHexString()
  resolverEvent.save()
}

export function handleMulticoinAddrChanged(event: AddressChangedEvent): void {
  let resolver = getOrCreateResolver(event.args.node, event.address)

  let coinType = event.args.coinType
  if(resolver.coinTypes == null) {
    resolver.coinTypes = [coinType];
    resolver.save();
  } else {
    let coinTypes = resolver.coinTypes!
    if(!coinTypes.includes(coinType)){
      coinTypes.push(coinType)
      resolver.coinTypes = coinTypes
      resolver.save()
    }
  }

  let resolverEvent = new MulticoinAddrChanged(createEventID(event))
  resolverEvent.resolver = resolver.id
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.coinType = coinType
  resolverEvent.addr = event.args.newAddress
  resolverEvent.save()
}

export function handleNameChanged(event: NameChangedEvent): void {
  if(event.args.name.indexOf("\u0000") != -1) return;

  let resolverEvent = new NameChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.name = event.args.name
  resolverEvent.save()
}

export function handleABIChanged(event: ABIChangedEvent): void {
  let resolverEvent = new AbiChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.contentType = event.args.contentType
  resolverEvent.save()
}

export function handlePubkeyChanged(event: PubkeyChangedEvent): void {
  let resolverEvent = new PubkeyChanged(createEventID(event))
  resolverEvent.resolverId = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.x = event.args.x
  resolverEvent.y = event.args.y
  resolverEvent.save()
}

export function handleTextChanged(event: TextChangedEvent): void {
  let resolver = getOrCreateResolver(event.args.node, event.address)

  let key = event.args.key;
  if(resolver.texts == null) {
    resolver.texts = [key];
    resolver.save();
  } else {
    let texts = resolver.texts!
    if(!texts.includes(key)){
      texts.push(key)
      resolver.texts = texts
      resolver.save()
    }
  }

  let resolverEvent = new TextChanged(createEventID(event))
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.key = event.args.key
  resolverEvent.save()
}

export function handleTextChangedWithValue(event: TextChangedWithValueEvent): void {
  let resolver = getOrCreateResolver(event.args.node, event.address)

  let key = event.args.key;
  if(resolver.texts == null) {
    resolver.texts = [key];
    resolver.save();
  } else {
    let texts = resolver.texts!
    if(!texts.includes(key)){
      texts.push(key)
      resolver.texts = texts
      resolver.save()
    }
  }

  let resolverEvent = new TextChanged(createEventID(event))
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.key = event.args.key
  resolverEvent.value = event.args.value
  resolverEvent.save()
}

export function handleContentHashChanged(event: ContenthashChangedEvent): void {
  let resolver = getOrCreateResolver(event.args.node, event.address)
  resolver.contentHash = event.args.hash
  resolver.save()

  let resolverEvent = new ContenthashChanged(createEventID(event))
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.hash = event.args.hash
  resolverEvent.save()
}

export function handleInterfaceChanged(event: InterfaceChangedEvent): void {
  let resolverEvent = new InterfaceChanged(createEventID(event))
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.interfaceID = event.args.interfaceID
  resolverEvent.implementer = event.args.implementer
  resolverEvent.save()
}

export function handleAuthorisationChanged(event: AuthorisationChangedEvent): void {
  let resolverEvent = new AuthorisationChanged(createEventID(event))
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.owner = event.args.owner
  resolverEvent.target = event.args.target
  resolverEvent.isAuthorized = event.args.isAuthorised
  resolverEvent.save()
}

export function handleVersionChanged(event: VersionChangedEvent): void {
  let resolverEvent = new VersionChanged(createEventID(event))
  resolverEvent.blockNumber = event.block.number.toI32()
  resolverEvent.transactionID = event.transaction.hash
  resolverEvent.resolver = createResolverID(event.args.node, event.address)
  resolverEvent.version = event.args.newVersion
  resolverEvent.save()

  let domain = Domain.load(event.args.node.toHexString())
  if(domain && domain.resolver === resolverEvent.resolver) {
    domain.resolvedAddress = null
    domain.save()
  }

  let resolver = getOrCreateResolver(event.args.node, event.address)
  resolver.addr = null
  resolver.contentHash = null
  resolver.texts = null
  resolver.coinTypes = null
  resolver.save()
}

function getOrCreateResolver(node: Bytes, address: Address): Resolver {
  let id = createResolverID(node, address)
  let resolver = Resolver.load(id)
  if(resolver === null) {
    resolver = new Resolver(id)
    resolver.domain = node.toHexString()
    resolver.address = address
  }
  return resolver as Resolver
}

function createEventID(event: ethereum.Event): string {
  return event.block.number.toString().concat('-').concat(event.logIndex.toString())
}

function createResolverID(node: Bytes, resolver: Address): string {
  return resolver.toHexString().concat('-').concat(node.toHexString())
}
