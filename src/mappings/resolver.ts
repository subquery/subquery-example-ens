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
  TextChanged_bytes32_string_string_Event as TextChangedEvent,
  TextChanged_bytes32_string_string_string_Event as TextChangedWithValueEvent,
} from "../types/contracts/PublicResolver";

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
import { EthereumLog } from "@subql/types-ethereum";
import assert from "assert";

type TextChangedEventArgs = [
  string,
  { _isIndexed: boolean; hash: string },
  string
] & {
  node: string;
  indexedKey: { _isIndexed: boolean; hash: string };
  key: string;
};

export async function handleAddrChanged(
  event: EthereumLog<AddrChangedEvent["args"]>
): Promise<void> {

  assert(event.args, 'missing event.args')

  let account = new Account(event.args.a);
  await account.save();

  let resolver =  Resolver.create({
    id: createResolverID(event.args.node, event.address),
    domainId : event.args.node,
    address : event.address,
    addrId : event.args.a,
  });

  await resolver.save();

  let domain = await Domain.get(event.args.node);
  if (domain && domain.resolverId == resolver.id) {
    domain.resolvedAddressId = event.args.a;
    await domain.save();
  }

  let resolverEvent =  AddrChanged.create({
    id: createEventID(event),
    resolverId : resolver.id,
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    addrId : event.args.a,
    
  });
  await resolverEvent.save();
}

export async function handleMulticoinAddrChanged(
  event: EthereumLog<AddressChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolver = await getOrCreateResolver(event.args.node, event.address);
  let coinType = event.args.coinType;
  if (resolver.coinTypes == null || resolver.coinTypes == undefined) {
    resolver.coinTypes = [coinType.toBigInt()];
    await resolver.save();
  } else {
    let coinTypes = resolver.coinTypes!;
    if (!coinTypes.includes(coinType.toBigInt())) {
      coinTypes.push(coinType.toBigInt());
      resolver.coinTypes = coinTypes;
      await resolver.save();
    }
  }

  let resolverEvent = MulticoinAddrChanged.create({
    id: createEventID(event),
    resolverId : resolver.id,
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    coinType : coinType.toBigInt(),
    addr : event.args.newAddress, 
  });

  await resolverEvent.save();
}

export async function handleNameChanged(
  event: EthereumLog<NameChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  if (event.args.name.indexOf("\u0000") != -1) return;

  let resolverEvent = NameChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    name : event.args.name,
  });

  await resolverEvent.save();
}

export async function handleABIChanged(
  event: EthereumLog<ABIChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolverEvent = AbiChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    contentType : event.args.contentType.toBigInt(),
  });
  await resolverEvent.save();
}

export async function handlePubkeyChanged(
  event: EthereumLog<PubkeyChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolverEvent = PubkeyChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    x : event.args.x,
    y : event.args.y,
  });

  await resolverEvent.save();
}

export async function handleTextChanged(
  event: EthereumLog<TextChangedEventArgs>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolver = await getOrCreateResolver(event.args.node, event.address);
  const key = event.args[2];

  if (resolver.texts == null || resolver.texts == undefined) {
    resolver.texts = [key];
    await resolver.save();
  } else {
    let texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      await resolver.save();
    }
  }

  let resolverEvent = TextChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    key : key,
  });
  await resolverEvent.save();
}

export async function handleTextChangedWithValue(
  event: EthereumLog<TextChangedWithValueEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolver = await getOrCreateResolver(event.args.node, event.address);
  let key = event.args.key;
  if (resolver.texts == null || resolver.texts == undefined) {
    resolver.texts = [key];
    await resolver.save();
  } else {
    let texts = resolver.texts!;
    if (!texts.includes(key)) {
      texts.push(key);
      resolver.texts = texts;
      await resolver.save();
    }
  }

  let resolverEvent = TextChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    key : event.args.key,
    value : event.args.value, 
  });

  await resolverEvent.save();
}

export async function handleContentHashChanged(
  event: EthereumLog<ContenthashChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolver = await getOrCreateResolver(event.args.node, event.address);
  resolver.contentHash = event.args.hash;
  await resolver.save();

  let resolverEvent = ContenthashChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    hash : event.args.hash,
  });

  await resolverEvent.save();
}

export async function handleInterfaceChanged(
  event: EthereumLog<InterfaceChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolverEvent = InterfaceChanged.create({
    id: createEventID(event),
    resolverId : createResolverID(event.args.node, event.address),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    interfaceID : event.args.interfaceID,
    implementer : event.args.implementer,

  });
  await resolverEvent.save();
}

export async function handleAuthorisationChanged(
  event: EthereumLog<AuthorisationChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolverEvent = AuthorisationChanged.create({
    id: createEventID(event),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    resolverId : createResolverID(event.args.node, event.address),
    owner : event.args.owner,
    target : event.args.target,
    isAuthorized : event.args.isAuthorised,
  });
  await resolverEvent.save();
}

export async function handleVersionChanged(
  event: EthereumLog<VersionChangedEvent["args"]>
): Promise<void> {
  assert(event.args, 'missing event.args')

  let resolverEvent = VersionChanged.create({
    id: createEventID(event),
    blockNumber : event.block.number,
    transactionID : event.transactionHash,
    resolverId : createResolverID(event.args.node, event.address),
    version : event.args.newVersion.toBigInt(),
  });
  await resolverEvent.save();

  let domain = await Domain.get(event.args.node);
  if (domain && domain.resolverId === resolverEvent.resolverId) {
    domain.resolvedAddressId = undefined;
    await domain.save();
  }

  let resolver = await getOrCreateResolver(event.args.node, event.address);
  resolver.addrId = undefined;
  resolver.contentHash = undefined;
  resolver.texts = undefined;
  resolver.coinTypes = undefined;
  await resolver.save();
}

async function getOrCreateResolver(
  node: string,
  address: string
): Promise<Resolver> {
  let id = createResolverID(node, address);
  let resolver = await Resolver.get(id);
  if (!resolver) {
    resolver = Resolver.create({
      id,
      address,
      domainId: node
    });
  }
  return resolver as Resolver;
}

function createEventID(event: EthereumLog): string {
  return event.block.number
    .toString()
    .concat("-")
    .concat(event.logIndex.toString());
}

function createResolverID(node: string, resolver: string): string {
  return resolver.concat("-").concat(node);
}
